import * as fs from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { PRAnalyzerAgent } from '../../agents/pr-analyzer-agent.js';
import { loadUserConfig, getApiKey } from '../utils/config-loader.js';
import { archDocsExists } from '../../utils/arch-docs-parser.js';
import { resolveDefaultBranch } from '../../utils/branch-resolver.js';
import { ConfigurationError, GitHubAPIError, GitError } from '../../utils/errors.js';
import {
  createPeerReviewIntegration,
  formatPeerReviewOutput,
  type PeerReviewResult,
} from '../../issue-tracker/index.js';
import { ProviderFactory, type SupportedProvider } from '../../providers/index.js';
import { Fix } from '../../types/agent.types.js';

interface AnalyzeOptions {
  diff?: string;
  file?: string;
  staged?: boolean;
  branch?: string;
  title?: string;
  provider?: string;
  model?: string;
  agent?: boolean;
  summary?: boolean;
  risks?: boolean;
  complexity?: boolean;
  full?: boolean;
  verbose?: boolean;
  maxCost?: number;
  archDocs?: boolean;
  peerReview?: boolean; // Enable Jira peer review integration
}

interface AnalysisMode {
  summary: boolean;
  risks: boolean;
  complexity: boolean;
}

/**
 * Determine which files should be skipped during analysis
 */
function shouldSkipFile(filePath: string): boolean {
  // Skip dist files and other build artifacts
  if (filePath.startsWith('dist/') || filePath.includes('/dist/')) {
    return true;
  }
  if (filePath.startsWith('node_modules/') || filePath.includes('/node_modules/')) {
    return true;
  }
  // Skip .map files in dist
  if (filePath.endsWith('.map') && filePath.includes('dist/')) {
    return true;
  }
  // Skip .d.ts files in dist
  if (filePath.includes('.d.ts') && filePath.includes('dist/')) {
    return true;
  }
  return false;
}

/**
 * Get untracked files from git
 */
async function getUntrackedFiles(): Promise<string[]> {
  try {
    const output = execSync('git ls-files --others --exclude-standard', {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return output
      .trim()
      .split('\n')
      .filter((f) => f.length > 0 && !shouldSkipFile(f));
  } catch (error) {
    return [];
  }
}

/**
 * Get git diff with optional command
 */
async function getGitDiff(command?: string, defaultBranch?: string): Promise<string> {
  try {
    let diff: string = '';
    const maxBuffer = 200 * 1024 * 1024; // 200MB

    if (!command || command === 'default') {
      // Use resolved default branch
      const branch = defaultBranch || 'origin/main';
      try {
        diff = execSync(`git diff ${branch}`, {
          encoding: 'utf-8',
          maxBuffer,
        });
      } catch (error: any) {
        throw new GitError(
          `Failed to get diff from branch "${branch}". The branch may not exist locally. Run: git fetch origin && git checkout ${branch}`,
          `git diff ${branch}`,
        );
      }
    } else if (command === 'staged') {
      try {
        diff = execSync('git diff --staged', {
          encoding: 'utf-8',
          maxBuffer,
        });
      } catch (error: any) {
        throw new GitError(
          'Failed to get staged changes. Make sure you have staged files with: git add <files>',
          'git diff --staged',
        );
      }
    } else {
      // Custom branch or reference
      try {
        diff = execSync(`git diff ${command}`, {
          encoding: 'utf-8',
          maxBuffer,
        });
      } catch (error: any) {
        throw new GitError(
          `Failed to get diff from "${command}". The branch or reference may not exist.`,
          `git diff ${command}`,
        );
      }
    }

    // Normalize diff (remove trailing whitespace but preserve structure)
    diff = diff.trim();

    // Filter out dist files from the diff itself
    const lines = diff.split('\n');
    const filteredLines: string[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith('diff --git')) {
        const match = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
        if (match) {
          const filePath = match[2] !== '/dev/null' ? match[2] : match[1];
          if (shouldSkipFile(filePath)) {
            // Skip this entire file block - jump to next diff --git line
            i++;
            while (i < lines.length && !lines[i].startsWith('diff --git')) {
              i++;
            }
            continue; // Skip adding this block
          }
        }
      }
      filteredLines.push(line);
      i++;
    }
    diff = filteredLines.join('\n').trim();

    // Also get untracked files and add them as new files in the diff format
    const untrackedFiles = await getUntrackedFiles();
    if (untrackedFiles.length > 0) {
      for (const filePath of untrackedFiles) {
        if (shouldSkipFile(filePath)) continue;
        try {
          // Skip binary files and very large files (>5MB)
          if (!fs.existsSync(filePath)) continue;
          const stats = fs.statSync(filePath);
          if (stats.size > 5 * 1024 * 1024) continue;

          // Try to read as text (will throw for binary files)
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');

          // Format as git diff for new file (proper git diff format)
          const diffHeader = `diff --git a/dev/null b/${filePath}\nnew file mode 100644\nindex 0000000..1111111\n--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n`;

          // Add content with + prefix (git diff format)
          let fileDiff = diffHeader;
          for (const line of lines) {
            fileDiff += `+${line}\n`;
          }

          diff += (diff ? '\n' : '') + fileDiff;
        } catch (err) {
          // Skip files that can't be read as text (binary, permissions, etc.)
          try {
            if (fs.existsSync(filePath)) {
              const stats = fs.statSync(filePath);
              // Add binary file indicator
              diff += (diff ? '\n' : '') + `diff --git a/dev/null b/${filePath}\nnew file mode 100644\nBinary file (${(stats.size / 1024).toFixed(0)}KB)\n`;
            }
          } catch (statErr) {
            // Skip this file
            continue;
          }
        }
      }
    }

    // If diff is empty, check if we have untracked files
    if (!diff.trim() && untrackedFiles.length === 0) {
      throw new Error('No changes detected');
    }

    return diff || '';
  } catch (error) {
    console.error(chalk.red.bold('❌  Error getting git diff:'), error);
    console.error(chalk.yellow('💡  Make sure you have a git repository with changes to analyze.'));
    process.exit(1);
  }
}

/**
 * Get PR title from git
 */
async function getPRTitle(): Promise<string | undefined> {
  try {
    const title = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
    return title;
  } catch (error) {
    return undefined;
  }
}

/**
 * Estimate diff size in tokens
 */
function estimateDiffSize(diff: string): number {
  // Rough estimate: 1 character ≈ 0.25 tokens
  return Math.ceil(diff.length / 4);
}

/**
 * Analyze command - analyze PR diffs with AI
 *
 * This is the primary command for analyzing pull requests. It:
 * 1. Auto-detects git diff (defaults to origin/main)
 * 2. Supports custom diff sources (file, staged, branch)
 * 3. Uses intelligent agent for large diffs
 * 4. Provides risk, complexity, and summary analysis
 *
 * @example
 * // Analyze current branch against origin/main
 * pr-agent analyze
 *
 * // Analyze staged changes
 * pr-agent analyze --staged
 *
 * // Analyze against specific branch
 * pr-agent analyze --branch develop
 *
 * // Full analysis with all modes
 * pr-agent analyze --full
 */
export async function analyzePR(options: AnalyzeOptions = {}): Promise<void> {
  const spinner = ora('Initializing PR analysis...').start();

  try {
    // Load and validate configuration
    let config;
    try {
      config = await loadUserConfig(false, true); // Validate config
    } catch (error) {
      spinner.fail('Configuration error');
      if (error instanceof ConfigurationError) {
        console.error(chalk.red(`\n❌ ${error.message}`));
        process.exit(1);
      }
      throw error;
    }

    // Get provider and API key from config or environment
    if (options.verbose) {
      console.log(chalk.gray(`   Debug: options.provider: ${options.provider || 'undefined'}`));
      console.log(chalk.gray(`   Debug: config.ai?.provider: ${config.ai?.provider || 'undefined'}`));
    }
    const provider = (options.provider || config.ai?.provider || 'anthropic').toLowerCase() as SupportedProvider;
    const apiKey = getApiKey(provider, config);
    const model = options.model || config.ai?.model;

    if (!apiKey) {
      spinner.fail('No API key found');
      console.error(chalk.yellow('💡  Please set it in one of these ways:'));
      console.error(chalk.gray('   1. Run: pr-agent config --init'));
      console.error(chalk.gray(`   2. Set environment variable based on provider:`));
      console.error(chalk.gray('      - Anthropic (Claude): export ANTHROPIC_API_KEY="your-api-key"'));
      console.error(chalk.gray('      - OpenAI (GPT): export OPENAI_API_KEY="your-api-key"'));
      console.error(chalk.gray('      - Google (Gemini): export GOOGLE_API_KEY="your-api-key"'));
      console.error(chalk.gray('      - Zhipu (GLM): export ZHIPU_API_KEY="your-api-key"'));
      if (options.verbose) {
        console.error(chalk.gray(`   Debug: Provider=${provider}, Config apiKeys=${JSON.stringify(config.apiKeys || {})}`));
      }
      process.exit(1);
    }

    spinner.succeed(`Using AI provider: ${provider}`);

    // Resolve default branch if needed
    let defaultBranch: string | undefined;
    if (!options.diff && !options.file && !options.staged && !options.branch) {
      spinner.text = 'Resolving default branch...';
      try {
        const branchResult = await resolveDefaultBranch({
          configBranch: config.git?.defaultBranch,
          githubToken: process.env.GITHUB_TOKEN,
          fallbackToGit: true,
        });

        defaultBranch = branchResult.branch;

        if (branchResult.warning && options.verbose) {
          console.log(chalk.yellow(`\n⚠️  ${branchResult.warning}`));
        }

        if (options.verbose) {
          console.log(chalk.gray(`   Using branch: ${defaultBranch} (source: ${branchResult.source})`));
        }
      } catch (error) {
        if (error instanceof GitHubAPIError || error instanceof ConfigurationError) {
          spinner.fail('Branch resolution failed');
          console.error(chalk.red(`\n❌ ${error.message}`));
          if (error instanceof GitHubAPIError) {
            console.error(chalk.gray('\n💡  You can override the branch with:'));
            console.error(chalk.gray('   pr-agent analyze --branch <branch-name>'));
            console.error(chalk.gray('   Or set git.defaultBranch in config: pr-agent config --set git.defaultBranch=<branch>'));
          }
          process.exit(1);
        }
        throw error;
      }
    }

    // Determine analysis mode
    const mode: AnalysisMode = {
      summary: options.summary || options.full || false,
      risks: options.risks || options.full || false,
      complexity: options.complexity || options.full || false,
    };

    // Default to full if no mode specified
    if (!mode.summary && !mode.risks && !mode.complexity) {
      mode.summary = true;
      mode.risks = true;
      mode.complexity = true;
    }

    spinner.text = 'Fetching diff...';

    // Get the diff
    let diff: string;
    try {
      if (options.diff) {
        diff = options.diff;
      } else if (options.file) {
        diff = fs.readFileSync(options.file, 'utf-8');
      } else if (options.staged) {
        diff = await getGitDiff('staged');
      } else if (options.branch) {
        diff = await getGitDiff(options.branch);
      } else {
        diff = await getGitDiff('default', defaultBranch);
      }
    } catch (error) {
      spinner.fail('Failed to get diff');
      if (error instanceof GitError) {
        console.error(chalk.red(`\n❌ ${error.message}`));
        console.error(chalk.gray('\n💡  Troubleshooting:'));
        console.error(chalk.gray('   • Make sure you are in a git repository'));
        console.error(chalk.gray('   • Check that the branch exists: git branch -a'));
        console.error(chalk.gray('   • Fetch remote branches: git fetch origin'));
        console.error(chalk.gray('   • Use --branch flag to specify a different branch'));
        process.exit(1);
      }
      throw error;
    }

    if (!diff) {
      spinner.fail('No diff found');
      process.exit(1);
    }

    const title = options.title || (await getPRTitle());

    // Estimate token count
    const estimatedTokens = estimateDiffSize(diff);
    spinner.succeed(
      `Diff ready: ~${estimatedTokens.toLocaleString()} tokens (${(diff.length / 1024).toFixed(0)}KB)`,
    );

    // Show message for large diffs
    if (diff.length > 50000) {
      console.log(
        chalk.magenta.bold(
          '\n🤖  Using Intelligent Agent Analysis (handling large diffs without chunking)...\n',
        ),
      );
      console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    } else {
      console.log(chalk.gray('\n🔍 Analyzing changes...\n'));
    }

    // Check for arch-docs
    const useArchDocs = options.archDocs !== false; // Default to true if not specified
    const hasArchDocs = archDocsExists();

    if (useArchDocs && hasArchDocs) {
      console.log(chalk.cyan('📚 Architecture documentation detected - including in analysis\n'));
    } else if (options.archDocs && !hasArchDocs) {
      console.log(chalk.yellow('⚠️  --arch-docs flag specified but no .arch-docs folder found\n'));
    }

    const agent = new PRAnalyzerAgent({
      provider: provider,
      apiKey,
      model,
    });
    const result = await agent.analyze(diff, title, mode, {
      useArchDocs: useArchDocs && hasArchDocs,
      repoPath: process.cwd(),
      language: config.analysis?.language,
      framework: config.analysis?.framework,
      enableStaticAnalysis: config.analysis?.enableStaticAnalysis !== false,
    });

    // Display results
    displayAgentResults(result, mode, options.verbose || false);

    // Run Peer Review if enabled (via flag or config)
    const peerReviewEnabled = options.peerReview || config.peerReview?.enabled;
    if (options.verbose) {
      console.log(chalk.gray(`\n   Debug: peerReviewEnabled=${peerReviewEnabled}, options.peerReview=${options.peerReview}, config.peerReview?.enabled=${config.peerReview?.enabled}`));
    }
    if (peerReviewEnabled) {
      // Pass the same provider config to peer review so it uses the same LLM
      await runPeerReview(config, diff, title, result, options.verbose || false, {
        provider,
        apiKey,
        model,
      });
    }
  } catch (error: any) {
    spinner.fail('Analysis failed');

    // Handle specific error types with user-friendly messages
    if (error instanceof ConfigurationError) {
      console.error(chalk.red(`\n❌ Configuration Error: ${error.message}`));
      console.error(chalk.gray('\n💡  Run: pr-agent config --init to fix configuration'));
      process.exit(1);
    } else if (error instanceof GitHubAPIError) {
      console.error(chalk.red(`\n❌ GitHub API Error: ${error.message}`));
      if (error.statusCode === 401 || error.statusCode === 403) {
        console.error(chalk.gray('\n💡  Check your GITHUB_TOKEN environment variable'));
      }
      process.exit(1);
    } else if (error instanceof GitError) {
      console.error(chalk.red(`\n❌ Git Error: ${error.message}`));
      process.exit(1);
    } else if (error.message && error.message.includes('rate-limits')) {
      console.error(chalk.red.bold('\n❌  Rate limit error: Your diff is too large for the API.'));
      console.error(
        chalk.yellow('\n💡  Try reducing the diff size or adjusting maxTokens in config'),
      );
      process.exit(1);
    } else {
      // Generic error - sanitize output to avoid leaking sensitive info
      const errorMessage = error.message || String(error);
      // Don't log full stack traces or potential secrets
      const sanitizedMessage = errorMessage
        .replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-***')
        .replace(/ghp_[a-zA-Z0-9]+/g, 'ghp_***')
        .substring(0, 500); // Limit length

      console.error(chalk.red(`\n❌  Error: ${sanitizedMessage}`));
      if (options.verbose && error.stack) {
        console.error(chalk.gray('\nStack trace:'));
        console.error(chalk.gray(error.stack.substring(0, 1000)));
      }
      process.exit(1);
    }
  }
}

/**
 * Display agent analysis results
 */
function displayAgentResults(result: any, mode: AnalysisMode, verbose: boolean): void {
  console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green.bold('\n✨  Agent Analysis Complete!\n'));

  // Clean summary - remove markdown headers and duplicates
  let cleanSummary = result.summary;
  cleanSummary = cleanSummary.replace(/^#+\s*PR Analysis:?\s*/im, '');
  cleanSummary = cleanSummary.replace(/^##\s*Summary\s*/im, '');
  cleanSummary = cleanSummary.trim();

  const criticalFixes = result.fixes?.filter((f: Fix) => f.severity === 'critical') || [];
  const warningFixes = result.fixes?.filter((f: Fix) => f.severity === 'warning') || [];
  const totalFixes = result.fixes?.length || 0;

  if (mode.summary) {
    console.log(chalk.cyan.bold('📋 Summary\n'));
    console.log(chalk.white(cleanSummary));
    console.log('\n');
  }

  // Combined quick actions section - only fixes with line numbers (for PR comments)
  // Filter: only critical/warning, must have line number, sort critical first
  const prCommentFixes = result.fixes
    ?.filter((f: Fix) => 
      (f.severity === 'critical' || f.severity === 'warning') && 
      f.line !== undefined && 
      f.line !== null
    )
    .sort((a: Fix, b: Fix) => {
      // Sort: critical first, then warning
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return 0;
    }) || [];
  
  // Add recommendations (from AI) - only if we have critical issues
  const recommendations = (criticalFixes.length > 0 && result.recommendations) 
    ? result.recommendations.slice(0, 3) 
    : [];
  
  if (prCommentFixes.length > 0 || recommendations.length > 0) {
    console.log(chalk.cyan.bold(`💡 Quick Actions\n`));

    let actionIndex = 1;
    
    // Show fixes with line numbers (sorted critical first)
    prCommentFixes.forEach((fix: Fix) => {
      const severityIcon = fix.severity === 'critical' ? chalk.red('🔴') : chalk.yellow('🟡');
      const severityLabel = fix.severity === 'critical' ? chalk.red.bold('CRITICAL') : chalk.yellow.bold('WARNING');
      const sourceLabel = fix.source === 'semgrep' ? chalk.blue(' [Semgrep]') : chalk.magenta(' [AI]');
      const shortComment = fix.comment.split('\n')[0].substring(0, 120);
      
      console.log(chalk.white(`  ${actionIndex}. ${severityIcon} ${chalk.cyan(`\`${fix.file}:${fix.line}\``)} - ${severityLabel}${sourceLabel}`));
      console.log(chalk.gray(`     ${shortComment}${fix.comment.length > 120 ? '...' : ''}`));
      console.log('');
      actionIndex++;
    });

    // Show recommendations if we have critical fixes - format to match Semgrep
    if (recommendations.length > 0) {
      recommendations.forEach((rec: string) => {
        // Parse recommendation to extract severity
        let severityIcon = chalk.yellow('🟡');
        let severityLabel = chalk.yellow.bold('WARNING');
        let recText = rec;
        
        // Check if recommendation starts with **CRITICAL: or **WARNING:
        if (rec.match(/^\*\*CRITICAL:/i)) {
          severityIcon = chalk.red('🔴');
          severityLabel = chalk.red.bold('CRITICAL');
          recText = rec.replace(/^\*\*CRITICAL:\s*/i, '').replace(/\*\*/g, '');
        } else if (rec.match(/^\*\*WARNING:/i)) {
          severityIcon = chalk.yellow('🟡');
          severityLabel = chalk.yellow.bold('WARNING');
          recText = rec.replace(/^\*\*WARNING:\s*/i, '').replace(/\*\*/g, '');
        } else if (rec.toLowerCase().includes('critical')) {
          severityIcon = chalk.red('🔴');
          severityLabel = chalk.red.bold('CRITICAL');
        }
        
        const sourceLabel = chalk.magenta(' [AI]');
        const shortComment = recText.substring(0, 120);
        
        // Format exactly like Semgrep: Number. Icon - LABEL [Source]
        console.log(chalk.white(`  ${actionIndex}. ${severityIcon} - ${severityLabel}${sourceLabel}`));
        // Indented comment line with severity prefix
        console.log(chalk.gray(`     ${severityIcon} **${severityLabel.includes('CRITICAL') ? 'Critical' : 'Warning'}**: ${shortComment}${recText.length > 120 ? '...' : ''}`));
        console.log('');
        actionIndex++;
      });
    }

    const totalFilteredFixes = result.fixes?.filter((f: Fix) =>
      (f.severity === 'critical' || f.severity === 'warning') && f.line !== undefined && f.line !== null
    ).length || 0;

    if (totalFilteredFixes > prCommentFixes.length) {
      console.log(chalk.gray(`  ... and ${totalFilteredFixes - prCommentFixes.length} more issues\n`));
    }
  }

  // Show recommendations if available
  if (result.recommendations.length > 0) {
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.cyan.bold('\n💡 Recommendations\n'));
    result.recommendations.forEach((rec: string, i: number) => {
      console.log(chalk.white(`  ${i + 1}. ${rec}`));
    });
    console.log('\n');
  }

  // Show agent reasoning if available (minimal)
  if (verbose && result.reasoning.length > 0 && result.reasoning.length <= 5) {
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.cyan.bold('\n🤔 Analysis Strategy\n'));
    result.reasoning.forEach((reason: string, i: number) => {
      if (reason.includes('Strategy:') || i === 0) {
        console.log(chalk.gray(`  ${reason.substring(0, 150)}${reason.length > 150 ? '...' : ''}`));
      }
    });
    console.log('\n');
  }

  // Show arch-docs impact if used
  if (result.archDocsImpact?.used) {
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.blue.bold('\n📚 Architecture Documentation Impact\n'));

    console.log(chalk.white(`Documents analyzed: ${result.archDocsImpact.docsAvailable}`));
    console.log(chalk.white(`Relevant sections used: ${result.archDocsImpact.sectionsUsed}\n`));

    if (result.archDocsImpact.influencedStages.length > 0) {
      console.log(chalk.cyan('Stages influenced by arch-docs:'));
      result.archDocsImpact.influencedStages.forEach((stage: string) => {
        const stageEmoji = stage === 'file-analysis' ? '🔍' :
                          stage === 'risk-detection' ? '⚠️' :
                          stage === 'complexity-calculation' ? '📊' :
                          stage === 'summary-generation' ? '📝' :
                          stage === 'refinement' ? '🔄' : '✨';
        console.log(chalk.white(`  ${stageEmoji} ${stage}`));
      });
      console.log('');
    }

    if (result.archDocsImpact.keyInsights.length > 0) {
      console.log(chalk.cyan('Key insights from arch-docs integration:\n'));
      result.archDocsImpact.keyInsights.forEach((insight: string, i: number) => {
        console.log(chalk.white(`  ${i + 1}. ${insight}`));
      });
      console.log('');
    }
  } else {
    console.log(chalk.green.bold('✅ Status\n'));
    console.log(chalk.white('  No critical issues found.\n\n'));
  }

  // Token count at the end
  if (result.totalTokensUsed) {
    console.log(chalk.gray(`Total tokens used: ${result.totalTokensUsed.toLocaleString()}`));
  }

  console.log(chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
}

/**
 * Run Peer Review analysis against linked Jira tickets
 *
 * This extends the PR analysis with business context validation:
 * - Fetches linked Jira tickets from PR title/branch
 * - Rates ticket quality
 * - Validates implementation against derived requirements
 * - Provides senior-dev style verdict
 */
async function runPeerReview(
  config: any,
  diff: string,
  title: string | undefined,
  prAnalysisResult: any,
  verbose: boolean,
  providerOptions: { provider: SupportedProvider; apiKey: string; model?: string }
): Promise<void> {
  const spinner = ora('Running Peer Review analysis...').start();

  try {
    // Create LLM using the same provider as main analysis
    const llm = ProviderFactory.createChatModel({
      provider: providerOptions.provider,
      apiKey: providerOptions.apiKey,
      model: providerOptions.model,
      temperature: 0.2,
      maxTokens: 4000,
    });

    // Create peer review integration from config, passing the LLM
    const peerReviewConfig = config.peerReview || {};
    const integration = createPeerReviewIntegration(peerReviewConfig, llm);

    if (!integration.isEnabled()) {
      spinner.warn('Peer Review enabled but not configured. Add Jira settings to config.');
      console.log(chalk.gray('   Run: pr-agent config --set peerReview.instanceUrl=https://your.atlassian.net'));
      console.log(chalk.gray('   Or configure MCP: peerReview.useMcp=true'));
      if (verbose) {
        console.log(chalk.gray(`   Debug: peerReviewConfig=${JSON.stringify(peerReviewConfig)}`));
      }
      return;
    }

    // Get branch name for ticket extraction
    let branchName: string | undefined;
    try {
      branchName = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      // Ignore - branch name is optional
    }

    // Get commit messages for ticket extraction
    let commitMessages: string[] = [];
    try {
      const commits = execSync('git log --oneline -10', { encoding: 'utf-8' });
      commitMessages = commits.trim().split('\n');
    } catch {
      // Ignore
    }

    // Parse diff to get file info
    const files = parseDiffFiles(diff);

    spinner.text = 'Extracting ticket references...';

    // Run peer review analysis
    const result = await integration.analyze({
      prTitle: title || 'Untitled PR',
      prDescription: undefined, // Could extract from git commit body
      branchName,
      commitMessages,
      diff,
      files,
      prSummary: prAnalysisResult.summary,
      prRisks: prAnalysisResult.overallRisks,
      prComplexity: prAnalysisResult.overallComplexity,
    });

    spinner.succeed('Peer Review analysis complete');

    // Display peer review results
    const output = formatPeerReviewOutput(result);
    if (output) {
      console.log(output);
    }

    if (verbose && result.ticketReferences.length > 0) {
      console.log(chalk.gray('Ticket references found:'));
      result.ticketReferences.forEach((ref) => {
        console.log(chalk.gray(`  - ${ref.key} (from ${ref.source}, confidence: ${ref.confidence}%)`));
      });
    }
  } catch (error: any) {
    spinner.fail('Peer Review analysis failed');
    console.error(chalk.yellow(`⚠️  ${error.message || 'Unknown error'}`));
    console.log(chalk.gray('   The main PR analysis completed successfully.'));
    console.log(chalk.gray('   Peer Review is an optional enhancement - check Jira configuration.'));
  }
}

/**
 * Parse diff to extract file information
 */
function parseDiffFiles(diff: string): Array<{
  path: string;
  additions: number;
  deletions: number;
  status: string;
}> {
  const files: Array<{
    path: string;
    additions: number;
    deletions: number;
    status: string;
  }> = [];

  const filePattern = /^diff --git a\/(.+?) b\/(.+?)$/gm;
  let match;

  while ((match = filePattern.exec(diff)) !== null) {
    const filePath = match[2] !== '/dev/null' ? match[2] : match[1];
    const isNew = match[1] === '/dev/null' || match[1].startsWith('dev/null');
    const isDeleted = match[2] === '/dev/null';

    // Count additions and deletions (simplified)
    const fileStart = match.index;
    const nextFileMatch = filePattern.exec(diff);
    const fileEnd = nextFileMatch ? nextFileMatch.index : diff.length;
    filePattern.lastIndex = match.index + 1; // Reset to continue from after current match

    const fileContent = diff.substring(fileStart, fileEnd);
    const additions = (fileContent.match(/^\+[^+]/gm) || []).length;
    const deletions = (fileContent.match(/^-[^-]/gm) || []).length;

    files.push({
      path: filePath,
      additions,
      deletions,
      status: isNew ? 'added' : isDeleted ? 'deleted' : 'modified',
    });
  }

  return files;
}
