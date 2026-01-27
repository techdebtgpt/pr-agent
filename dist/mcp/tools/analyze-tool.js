/**
 * Analyze Tool Handler
 * Handles the 'analyze' MCP tool
 * Single Responsibility: Orchestrate PR analysis workflow
 */
import { PRAnalyzerAgent } from '../../agents/pr-analyzer-agent.js';
import { loadUserConfig } from '../../cli/utils/config-loader.js';
import { resolveDefaultBranch } from '../../utils/branch-resolver.js';
import { ExecutionMode as ExecutionModeEnum } from '../../types/agent.types.js';
import { GitService, TicketExtractorService, FormatterService, PeerReviewService, } from '../services/index.js';
import { ERROR_MESSAGES, DEFAULT_DASHBOARD_PORT, DEFAULTS } from '../constants.js';
import { analyzeDevOpsFiles } from '../../tools/devops-cost-estimator.js';
import { parseDiff } from '../../tools/pr-analysis-tools.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// __dirname workaround for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export class AnalyzeTool {
    dashboardService;
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    async execute(args) {
        const workDir = args.cwd || process.cwd();
        const verbose = args.verbose || false;
        try {
            // Load configuration
            let config = {};
            try {
                config = await loadUserConfig(verbose, false);
            }
            catch (e) {
                // Config not found is OK
            }
            // Resolve base branch
            let baseBranch = args.branch;
            if (!baseBranch && !args.staged) {
                try {
                    const branchResult = await resolveDefaultBranch({
                        configBranch: config.git?.defaultBranch,
                        githubToken: process.env.GITHUB_TOKEN,
                        fallbackToGit: true,
                    });
                    baseBranch = branchResult.branch;
                }
                catch {
                    baseBranch = DEFAULTS.DEFAULT_BRANCH;
                }
            }
            // Get diff
            let diff;
            if (args.staged) {
                diff = GitService.getGitDiff('git diff --staged', { cwd: workDir });
            }
            else {
                diff = GitService.getGitDiff(`git diff ${baseBranch}`, { cwd: workDir });
            }
            const title = args.title || GitService.getPRTitle(workDir);
            const currentBranch = GitService.getCurrentBranch(workDir);
            const repoInfo = GitService.getRepoInfo(workDir);
            // Check for changes
            if (!diff) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: ERROR_MESSAGES.NO_CHANGES(currentBranch, baseBranch || 'staged'),
                        },
                    ],
                };
            }
            // Extract ticket references
            const commitMessages = GitService.getCommitMessages(workDir);
            const peerReviewEnabled = config.peerReview?.enabled ?? false;
            if (verbose) {
                console.error(`[MCP Server] Config loaded: peerReview.enabled=${peerReviewEnabled}, archDocs=${args.archDocs !== false}`);
            }
            const ticketRefs = TicketExtractorService.extractTicketReferences(title, currentBranch, commitMessages, config.peerReview?.defaultProject);
            // Create PRAnalyzerAgent in PROMPT_ONLY mode
            const agent = new PRAnalyzerAgent({ mode: ExecutionModeEnum.PROMPT_ONLY });
            // Run analysis to get prompts (no LLM execution)
            const useArchDocs = args.archDocs !== false;
            if (verbose) {
                console.error('[MCP Server] Building analysis prompts in PROMPT_ONLY mode...');
            }
            const analysisResult = await agent.analyze(diff, title, { summary: true, risks: true, complexity: true }, {
                useArchDocs,
                repoPath: workDir,
                language: config.analysis?.language,
                framework: config.analysis?.framework,
                enableStaticAnalysis: config.analysis?.enableStaticAnalysis !== false,
            });
            // DETERMINISTIC ANALYSIS: DevOps cost estimation (runs even in PROMPT_ONLY mode)
            let devOpsCostEstimates;
            let totalDevOpsCost = 0;
            const parsedFiles = parseDiff(diff);
            const filesForCostAnalysis = parsedFiles.map((f) => ({ path: f.path, diff: f.diff }));
            if (verbose) {
                console.error(`[MCP Server] Parsed ${parsedFiles.length} files for cost analysis`);
                console.error(`[MCP Server] Sample file paths: ${parsedFiles.slice(0, 3).map((f) => f.path).join(', ')}`);
            }
            const costAnalysis = analyzeDevOpsFiles(filesForCostAnalysis);
            if (verbose) {
                console.error(`[MCP Server] Cost analysis complete: hasDevOpsChanges=${costAnalysis.hasDevOpsChanges}, estimates=${costAnalysis.estimates.length}`);
            }
            if (costAnalysis.hasDevOpsChanges && costAnalysis.estimates.length > 0) {
                devOpsCostEstimates = costAnalysis.estimates;
                totalDevOpsCost = costAnalysis.totalEstimatedCost;
                console.error(`[MCP Server] DevOps costs: ${costAnalysis.estimates.length} resources (~$${totalDevOpsCost.toFixed(2)}/month)`);
            }
            else if (verbose) {
                console.error(`[MCP Server] No DevOps costs found`);
            }
            if (verbose) {
                console.error('[MCP Server] Analysis prompts built');
                console.error(`  - mode: ${analysisResult.mode}`);
                console.error(`  - prompt count: ${analysisResult.mode === 'prompt_only' ? analysisResult.prompts.length : 'N/A'}`);
                console.error(`  - peer review: ${peerReviewEnabled ? 'enabled' : 'disabled'}`);
            }
            // Type guard
            if (analysisResult.mode !== 'prompt_only') {
                throw new Error('Expected prompt-only result in MCP mode');
            }
            // Get peer review prompts if enabled
            let peerReviewError;
            if (peerReviewEnabled) {
                try {
                    const peerReviewResult = await PeerReviewService.runPeerReview({
                        config,
                        diff,
                        title,
                        prAnalysisResult: analysisResult,
                        verbose,
                        workDir,
                    });
                    if (peerReviewResult &&
                        peerReviewResult.mode === 'prompt_only' &&
                        peerReviewResult.promptOnlyResult) {
                        analysisResult.prompts.push(...peerReviewResult.promptOnlyResult.prompts);
                        console.error(`  - Peer review prompts: ${peerReviewResult.promptOnlyResult.prompts.length}`);
                    }
                    else if (peerReviewResult && peerReviewResult.error) {
                        peerReviewError = peerReviewResult.error;
                        console.error(`[MCP Server] Peer review failed: ${peerReviewError}`);
                    }
                }
                catch (error) {
                    peerReviewError = error.message;
                    console.error('[MCP Server] Peer review prompt building failed:', error.message);
                    if (verbose) {
                        console.error(error.stack);
                    }
                }
            }
            // Format output
            const outputOptions = {
                verbose,
                peerReviewEnabled,
                peerReviewError,
                allPrompts: analysisResult.prompts,
                staticAnalysis: analysisResult.staticAnalysis,
                devOpsCostEstimates,
                totalDevOpsCost,
                projectClassification: analysisResult.projectClassification,
                repoInfo,
                currentBranch,
                baseBranch,
                title,
            };
            if (verbose && devOpsCostEstimates) {
                console.error(`[MCP Server] Passing ${devOpsCostEstimates.length} cost estimates to formatter:`);
                devOpsCostEstimates.forEach((est, i) => {
                    console.error(`  [${i}] ${est.resourceType}: cost=$${est.estimatedNewCost}, details="${est.details}"`);
                });
            }
            const outputText = FormatterService.formatAnalysisOutput(outputOptions);
            // Start dashboard in background
            await this.dashboardService.startInBackground(DEFAULT_DASHBOARD_PORT, __dirname);
            return {
                content: [
                    {
                        type: 'text',
                        text: outputText,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: ERROR_MESSAGES.ANALYSIS_FAILED(error.message),
                    },
                ],
            };
        }
    }
}
//# sourceMappingURL=analyze-tool.js.map