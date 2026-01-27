/**
 * MCP Server Constants
 * All magic strings, numbers, and configuration defaults
 */
import { z } from 'zod';
// MCP Server Metadata
export const MCP_SERVER_NAME = 'pr-agent';
export const MCP_SERVER_VERSION = '1.0.0';
// Dashboard Configuration
export const DEFAULT_DASHBOARD_PORT = 3000;
export const DASHBOARD_API_STATS_PATH = '/dashboard/api/stats';
export const DASHBOARD_CATCH_ALL_PATH = '/{*splat}';
// Git Configuration
export const DEFAULT_GIT_LOG_LIMIT = 10;
export const DEFAULT_MAX_BUFFER = 200 * 1024 * 1024; // 200MB
// Analysis Configuration
export const DEFAULT_PROMPT_LIMIT_VERBOSE = 30000;
export const DEFAULT_PROMPT_LIMIT_NORMAL = 15000;
export const EXPECTED_TOKEN_USAGE_MINIMUM = 5000;
// Prompt Step Emojis
export const PROMPT_STEP_EMOJIS = {
    fileAnalysis: '📄',
    riskDetection: '⚠️',
    summaryGeneration: '📋',
    selfRefinement: '✨',
    ticketQuality: '🎯',
    acValidation: '✅',
    peerReview: '👥',
};
// Default Prompt Step Emoji
export const DEFAULT_PROMPT_EMOJI = '🔹';
// Error Messages
export const ERROR_MESSAGES = {
    NO_CHANGES: (currentBranch, baseBranch) => `No changes detected between ${currentBranch} and ${baseBranch || 'staged'}`,
    ANALYSIS_FAILED: (message) => `❌ Analysis failed: ${message}\n\nMake sure you are in a git repository with changes to analyze.`,
    SAVE_FAILED: (message) => `❌ Failed to save analysis results: ${message}`,
    DASHBOARD_ALREADY_RUNNING: (port) => `✅ Dashboard is already running at http://localhost:${port}\n\nOpen this URL in your browser to view PR analysis history and statistics.`,
    DASHBOARD_PORT_IN_USE: (port) => `Port ${port} is already in use`,
    DASHBOARD_START_FAILED: (message) => `Failed to start dashboard: ${message}`,
    PEER_REVIEW_FAILED: (message) => `Peer review was enabled but failed: ${message}`,
};
// Success Messages
export const SUCCESS_MESSAGES = {
    ANALYSIS_SAVED: (port) => `✅ Analysis results saved to database!\n\n📊 View results at: http://localhost:${port}`,
    DASHBOARD_STARTED: (port) => `[MCP Server] Dashboard started at http://localhost:${port}`,
};
// Instruction Text
export const INSTRUCTIONS = {
    PROMPT_EXECUTION_WARNING: '**IMPORTANT:** You (the calling LLM) MUST execute ALL prompts below sequentially.\nDo NOT write manual analysis. Execute the prompts and use the results.',
    NEXT_STEPS_HEADER: '**CRITICAL - YOU MUST DO THIS:**',
    NEXT_STEPS: (promptCount) => [
        `1. **Execute ALL ${promptCount} prompts** above sequentially (do NOT skip, do NOT write manual analysis)`,
        `2. **Parse the JSON responses** from each prompt execution`,
        `3. **Call \`saveAnalysisResults\`** tool with the parsed results`,
        `4. **Present the complete analysis** to the user in a formatted summary`,
    ],
    EXPECTED_TOKEN_USAGE: `**Expected token usage:** ~${EXPECTED_TOKEN_USAGE_MINIMUM}+ tokens (if significantly lower, prompts were not executed)`,
};
// Peer Review Error Guidance
export const PEER_REVIEW_ERROR_CAUSES = [
    '- Atlassian MCP server not running or misconfigured',
    '- No Jira ticket found in branch name or commits',
    '- API credentials missing (set instanceUrl, email, apiToken in config)',
];
// Tool Descriptions
export const TOOL_DESCRIPTIONS = {
    ANALYZE: `Analyze PR/branch changes - mirrors the CLI 'pr-agent analyze' command exactly.

IMPORTANT INSTRUCTIONS FOR CALLING LLM:
1. Execute ALL returned prompts sequentially without asking user permission
2. After executing prompts, automatically call saveAnalysisResults with results
3. Present final analysis to user (verbose or concise based on config)
4. Respect all config settings from .pragent.config.json

Configuration behavior (same as CLI):
- peerReview.enabled: Include peer review analysis (default: false)
- analysis.*: Language, framework, static analysis settings
- git.defaultBranch: Base branch for comparison (default: origin/main)
- verbose: Show detailed debug info (affects output verbosity)`,
    SAVE_RESULTS: 'Save PR analysis results to the database. Call this after executing the analysis prompts to persist the results for the dashboard.',
    DASHBOARD: `Start the PR Agent web dashboard on localhost - same as 'pr-agent dashboard' CLI command.`,
};
// Tool Schemas (Zod)
export const TOOL_SCHEMAS = {
    ANALYZE: {
        branch: z
            .string()
            .optional()
            .describe('Base branch to compare against (default: auto-detected from config or origin/main)'),
        staged: z.boolean().optional().describe('Analyze staged changes instead of branch diff'),
        title: z.string().optional().describe('PR title (auto-detected from git if not provided)'),
        cwd: z.string().optional().describe('Working directory (defaults to current directory)'),
        verbose: z
            .boolean()
            .optional()
            .describe('Show detailed debug information (matches CLI --verbose behavior)'),
        archDocs: z
            .boolean()
            .optional()
            .describe('Include architecture documentation context - uses config if not specified'),
    },
    SAVE_RESULTS: {
        prNumber: z.number().optional().describe('PR number'),
        title: z.string().describe('PR title'),
        repoOwner: z.string().optional().describe('Repository owner'),
        repoName: z.string().optional().describe('Repository name'),
        author: z.string().optional().describe('Author name'),
        complexity: z.number().min(1).max(5).describe('Overall complexity score (1-5)'),
        risksCount: z.number().describe('Number of critical/warning risks'),
        risks: z.array(z.string()).describe('List of risk descriptions'),
        recommendations: z.array(z.string()).describe('List of recommendations'),
        projectClassification: z.string().optional().describe('Project classification (JSON string)'),
        peerReviewEnabled: z.boolean().optional(),
        ticketKey: z.string().optional().describe('Jira ticket key (e.g., TODO-2)'),
        ticketQualityScore: z.number().optional().describe('Ticket quality score (0-100)'),
        ticketQualityTier: z.string().optional().describe('Ticket quality tier'),
        acCompliancePercentage: z.number().optional().describe('AC compliance percentage'),
        acRequirementsMet: z.number().optional(),
        acRequirementsTotal: z.number().optional(),
        peerReviewVerdict: z
            .string()
            .optional()
            .describe('approve/request_changes/needs_discussion'),
        peerReviewBlockers: z.array(z.string()).optional(),
        peerReviewWarnings: z.array(z.string()).optional(),
        implementationCompleteness: z.number().optional(),
        qualityScore: z.number().optional(),
        devopsCostMonthly: z.number().optional().describe('Estimated monthly infrastructure cost'),
        devopsResources: z.string().optional().describe('JSON array of detected infrastructure resources'),
    },
    DASHBOARD: {
        port: z.number().optional().describe('Port to run the dashboard on (default: 3000)'),
    },
};
// Git Patterns
export const GIT_PATTERNS = {
    SSH_REMOTE: /git@[^:]+:([^/]+)\/(.+?)(?:\.git)?$/,
    HTTPS_REMOTE: /https?:\/\/[^/]+\/([^/]+)\/(.+?)(?:\.git)?$/,
    FILE_DIFF_HEADER: /^diff --git a\/(.*) b\/(.*)$/gm,
};
// File Status Icons
export const FILE_STATUS_ICONS = {
    A: '➕',
    D: '➖',
    M: '📝',
};
// Default Values
export const DEFAULTS = {
    REPO_OWNER: 'local',
    REPO_NAME: 'unknown',
    BRANCH_NAME: 'unknown',
    AUTHOR: 'unknown',
    DEFAULT_BRANCH: 'origin/main',
};
//# sourceMappingURL=constants.js.map