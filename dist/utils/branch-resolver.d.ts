/**
 * Branch resolution utilities
 * Handles detection of default branch from GitHub API or git commands
 */
export interface BranchResolutionOptions {
    configBranch?: string;
    githubToken?: string;
    repoOwner?: string;
    repoName?: string;
    fallbackToGit?: boolean;
}
export interface BranchResolutionResult {
    branch: string;
    source: 'config' | 'github' | 'git' | 'fallback';
    warning?: string;
}
/**
 * Resolve the default branch to use for analysis
 */
export declare function resolveDefaultBranch(options?: BranchResolutionOptions): Promise<BranchResolutionResult>;
