/**
 * MCP Server Constants
 * All magic strings, numbers, and configuration defaults
 */
import { z } from 'zod';
export declare const MCP_SERVER_NAME = "pr-agent";
export declare const MCP_SERVER_VERSION = "1.0.0";
export declare const DEFAULT_DASHBOARD_PORT = 3000;
export declare const DASHBOARD_API_STATS_PATH = "/dashboard/api/stats";
export declare const DASHBOARD_CATCH_ALL_PATH = "/{*splat}";
export declare const DEFAULT_GIT_LOG_LIMIT = 10;
export declare const DEFAULT_MAX_BUFFER: number;
export declare const DEFAULT_PROMPT_LIMIT_VERBOSE = 30000;
export declare const DEFAULT_PROMPT_LIMIT_NORMAL = 15000;
export declare const EXPECTED_TOKEN_USAGE_MINIMUM = 5000;
export declare const PROMPT_STEP_EMOJIS: Record<string, string>;
export declare const DEFAULT_PROMPT_EMOJI = "\uD83D\uDD39";
export declare const ERROR_MESSAGES: {
    NO_CHANGES: (currentBranch: string, baseBranch: string) => string;
    ANALYSIS_FAILED: (message: string) => string;
    SAVE_FAILED: (message: string) => string;
    DASHBOARD_ALREADY_RUNNING: (port: number) => string;
    DASHBOARD_PORT_IN_USE: (port: number) => string;
    DASHBOARD_START_FAILED: (message: string) => string;
    PEER_REVIEW_FAILED: (message: string) => string;
};
export declare const SUCCESS_MESSAGES: {
    ANALYSIS_SAVED: (port: number) => string;
    DASHBOARD_STARTED: (port: number) => string;
};
export declare const INSTRUCTIONS: {
    PROMPT_EXECUTION_WARNING: string;
    NEXT_STEPS_HEADER: string;
    NEXT_STEPS: (promptCount: number) => string[];
    EXPECTED_TOKEN_USAGE: string;
};
export declare const PEER_REVIEW_ERROR_CAUSES: string[];
export declare const TOOL_DESCRIPTIONS: {
    ANALYZE: string;
    SAVE_RESULTS: string;
    DASHBOARD: string;
};
export declare const TOOL_SCHEMAS: {
    ANALYZE: {
        branch: z.ZodOptional<z.ZodString>;
        staged: z.ZodOptional<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
        cwd: z.ZodOptional<z.ZodString>;
        verbose: z.ZodOptional<z.ZodBoolean>;
        archDocs: z.ZodOptional<z.ZodBoolean>;
    };
    SAVE_RESULTS: {
        prNumber: z.ZodOptional<z.ZodNumber>;
        title: z.ZodString;
        repoOwner: z.ZodOptional<z.ZodString>;
        repoName: z.ZodOptional<z.ZodString>;
        author: z.ZodOptional<z.ZodString>;
        complexity: z.ZodNumber;
        risksCount: z.ZodNumber;
        risks: z.ZodArray<z.ZodString, "many">;
        recommendations: z.ZodArray<z.ZodString, "many">;
        projectClassification: z.ZodOptional<z.ZodString>;
        peerReviewEnabled: z.ZodOptional<z.ZodBoolean>;
        ticketKey: z.ZodOptional<z.ZodString>;
        ticketQualityScore: z.ZodOptional<z.ZodNumber>;
        ticketQualityTier: z.ZodOptional<z.ZodString>;
        acCompliancePercentage: z.ZodOptional<z.ZodNumber>;
        acRequirementsMet: z.ZodOptional<z.ZodNumber>;
        acRequirementsTotal: z.ZodOptional<z.ZodNumber>;
        peerReviewVerdict: z.ZodOptional<z.ZodString>;
        peerReviewBlockers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        peerReviewWarnings: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        implementationCompleteness: z.ZodOptional<z.ZodNumber>;
        qualityScore: z.ZodOptional<z.ZodNumber>;
        devopsCostMonthly: z.ZodOptional<z.ZodNumber>;
        devopsResources: z.ZodOptional<z.ZodString>;
    };
    DASHBOARD: {
        port: z.ZodOptional<z.ZodNumber>;
    };
};
export declare const GIT_PATTERNS: {
    SSH_REMOTE: RegExp;
    HTTPS_REMOTE: RegExp;
    FILE_DIFF_HEADER: RegExp;
};
export declare const FILE_STATUS_ICONS: Record<string, string>;
export declare const DEFAULTS: {
    REPO_OWNER: string;
    REPO_NAME: string;
    BRANCH_NAME: string;
    AUTHOR: string;
    DEFAULT_BRANCH: string;
};
