/**
 * Git Service
 * Handles all git operations for the MCP server
 * Single Responsibility: Git repository interactions
 */
import type { RepoInfo, GitOperationOptions } from '../types.js';
export declare class GitService {
    /**
     * Get git diff output
     * @throws Error if git command fails
     */
    static getGitDiff(command: string, options?: GitOperationOptions): string;
    /**
     * Get current branch name
     */
    static getCurrentBranch(cwd?: string): string;
    /**
     * Extract repository owner and name from git remote URL
     */
    static getRepoInfo(cwd?: string): RepoInfo;
    /**
     * Get PR title from latest commit message
     */
    static getPRTitle(cwd?: string): string | undefined;
    /**
     * Get git author from latest commit
     */
    static getGitAuthor(cwd?: string): string;
    /**
     * Get recent commit messages for ticket extraction
     */
    static getCommitMessages(cwd?: string, limit?: number): string[];
}
