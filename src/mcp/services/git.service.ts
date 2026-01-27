/**
 * Git Service
 * Handles all git operations for the MCP server
 * Single Responsibility: Git repository interactions
 */

import { execSync } from 'child_process';
import type { RepoInfo, GitOperationOptions } from '../types.js';
import {
  DEFAULT_GIT_LOG_LIMIT,
  DEFAULT_MAX_BUFFER,
  GIT_PATTERNS,
  DEFAULTS,
} from '../constants.js';

export class GitService {
  /**
   * Get git diff output
   * @throws Error if git command fails
   */
  static getGitDiff(command: string, options: GitOperationOptions = {}): string {
    try {
      const diff = execSync(command, {
        encoding: 'utf-8',
        cwd: options.cwd || process.cwd(),
        maxBuffer: options.maxBuffer || DEFAULT_MAX_BUFFER,
        shell: true,
      } as any);
      return diff.trim();
    } catch (error: any) {
      throw new Error(`Failed to get diff: ${error.message}`);
    }
  }

  /**
   * Get current branch name
   */
  static getCurrentBranch(cwd?: string): string {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
        cwd: cwd || process.cwd(),
        shell: true,
      } as any).trim();
    } catch {
      return DEFAULTS.BRANCH_NAME;
    }
  }

  /**
   * Extract repository owner and name from git remote URL
   */
  static getRepoInfo(cwd?: string): RepoInfo {
    try {
      const remoteUrl = execSync('git remote get-url origin', {
        encoding: 'utf-8',
        cwd: cwd || process.cwd(),
        shell: true,
      } as any).trim();

      // Try SSH format
      const sshMatch = remoteUrl.match(GIT_PATTERNS.SSH_REMOTE);
      if (sshMatch) {
        return { owner: sshMatch[1], name: sshMatch[2] };
      }

      // Try HTTPS format
      const httpsMatch = remoteUrl.match(GIT_PATTERNS.HTTPS_REMOTE);
      if (httpsMatch) {
        return { owner: httpsMatch[1], name: httpsMatch[2] };
      }

      return { owner: DEFAULTS.REPO_OWNER, name: DEFAULTS.REPO_NAME };
    } catch {
      return { owner: DEFAULTS.REPO_OWNER, name: DEFAULTS.REPO_NAME };
    }
  }

  /**
   * Get PR title from latest commit message
   */
  static getPRTitle(cwd?: string): string | undefined {
    try {
      const title = execSync('git log -1 --pretty=%s', {
        encoding: 'utf-8',
        cwd: cwd || process.cwd(),
        shell: true,
      } as any).trim();
      return title || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Get git author from latest commit
   */
  static getGitAuthor(cwd?: string): string {
    try {
      return execSync('git log -1 --pretty=%an', {
        encoding: 'utf-8',
        cwd: cwd || process.cwd(),
        shell: true,
      } as any).trim();
    } catch {
      return DEFAULTS.AUTHOR;
    }
  }

  /**
   * Get recent commit messages for ticket extraction
   */
  static getCommitMessages(
    cwd?: string,
    limit: number = DEFAULT_GIT_LOG_LIMIT
  ): string[] {
    try {
      const commits = execSync(`git log --oneline -${limit}`, {
        encoding: 'utf-8',
        cwd: cwd || process.cwd(),
        shell: true,
      } as any);
      return commits.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}
