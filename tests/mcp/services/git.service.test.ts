/**
 * Unit tests for GitService
 * Tests git command execution and output parsing
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GitService } from '../../../src/mcp/services/git.service.js';
import * as childProcess from 'child_process';

// Mock child_process
jest.mock('child_process');

describe('GitService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGitDiff', () => {
    it('should execute git diff command and return output', () => {
      const mockDiff = 'diff --git a/file.ts b/file.ts\n+added line';
      (childProcess.execSync as jest.Mock).mockReturnValue(Buffer.from(mockDiff));

      const result = GitService.getGitDiff('git diff main', { cwd: '/test' });

      expect(result).toBe(mockDiff);
      expect(childProcess.execSync).toHaveBeenCalledWith(
        'git diff main',
        expect.objectContaining({ cwd: '/test' })
      );
    });

    it('should return empty string when git command fails', () => {
      (childProcess.execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Git command failed');
      });

      const result = GitService.getGitDiff('git diff main');

      expect(result).toBe('');
    });

    it('should trim whitespace from diff output', () => {
      const mockDiff = '  \n  diff content  \n  ';
      (childProcess.execSync as jest.Mock).mockReturnValue(Buffer.from(mockDiff));

      const result = GitService.getGitDiff('git diff main');

      expect(result).toBe('diff content');
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', () => {
      (childProcess.execSync as jest.Mock).mockReturnValue(Buffer.from('feature/test-branch\n'));

      const result = GitService.getCurrentBranch('/test');

      expect(result).toBe('feature/test-branch');
      expect(childProcess.execSync).toHaveBeenCalledWith(
        'git rev-parse --abbrev-ref HEAD',
        expect.objectContaining({ cwd: '/test' })
      );
    });

    it('should return "unknown" when git command fails', () => {
      (childProcess.execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const result = GitService.getCurrentBranch('/test');

      expect(result).toBe('unknown');
    });
  });

  describe('getPRTitle', () => {
    it('should return latest commit message as PR title', () => {
      const commitMessage = 'feat: Add new feature';
      (childProcess.execSync as jest.Mock).mockReturnValue(Buffer.from(commitMessage));

      const result = GitService.getPRTitle('/test');

      expect(result).toBe(commitMessage);
      expect(childProcess.execSync).toHaveBeenCalledWith(
        'git log -1 --pretty=%B',
        expect.objectContaining({ cwd: '/test' })
      );
    });

    it('should return "Untitled PR" when git command fails', () => {
      (childProcess.execSync as jest.Mock).mockImplementation(() => {
        throw new Error('No commits');
      });

      const result = GitService.getPRTitle('/test');

      expect(result).toBe('Untitled PR');
    });
  });

  describe('getCommitMessages', () => {
    it('should return array of commit messages', () => {
      const commits = 'commit1\ncommit2\ncommit3';
      (childProcess.execSync as jest.Mock).mockReturnValue(Buffer.from(commits));

      const result = GitService.getCommitMessages('/test');

      expect(result).toEqual(['commit1', 'commit2', 'commit3']);
    });

    it('should filter empty lines', () => {
      const commits = 'commit1\n\n\ncommit2\n\ncommit3';
      (childProcess.execSync as jest.Mock).mockReturnValue(Buffer.from(commits));

      const result = GitService.getCommitMessages('/test');

      expect(result).toEqual(['commit1', 'commit2', 'commit3']);
    });

    it('should return empty array when git command fails', () => {
      (childProcess.execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Git error');
      });

      const result = GitService.getCommitMessages('/test');

      expect(result).toEqual([]);
    });
  });

  describe('getRepoInfo', () => {
    it('should parse GitHub HTTPS remote URL', () => {
      const remoteUrl = 'https://github.com/owner/repo.git';
      (childProcess.execSync as jest.Mock).mockReturnValue(Buffer.from(remoteUrl));

      const result = GitService.getRepoInfo('/test');

      expect(result).toEqual({
        owner: 'owner',
        name: 'repo',
      });
    });

    it('should parse GitHub SSH remote URL', () => {
      const remoteUrl = 'git@github.com:owner/repo.git';
      (childProcess.execSync as jest.Mock).mockReturnValue(Buffer.from(remoteUrl));

      const result = GitService.getRepoInfo('/test');

      expect(result).toEqual({
        owner: 'owner',
        name: 'repo',
      });
    });

    it('should return default values for invalid remote URL', () => {
      (childProcess.execSync as jest.Mock).mockReturnValue(Buffer.from('invalid-url'));

      const result = GitService.getRepoInfo('/test');

      expect(result).toEqual({
        owner: 'local',
        name: 'unknown',
      });
    });

    it('should return default values when git command fails', () => {
      (childProcess.execSync as jest.Mock).mockImplementation(() => {
        throw new Error('No remote');
      });

      const result = GitService.getRepoInfo('/test');

      expect(result).toEqual({
        owner: 'local',
        name: 'unknown',
      });
    });
  });
});
