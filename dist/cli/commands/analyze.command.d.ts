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
    peerReview?: boolean;
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
export declare function analyzePR(options?: AnalyzeOptions): Promise<void>;
export {};
