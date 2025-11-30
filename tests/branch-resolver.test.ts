/**
 * Tests for branch-resolver.ts
 * 
 * Note: These are integration-style tests that may require actual git repository
 * For unit tests, consider mocking git commands more thoroughly
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { resolveDefaultBranch } from '../src/utils/branch-resolver.js';
import { ConfigurationError } from '../src/utils/errors.js';

// Mock @octokit/rest to avoid ES module issues in tests
jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      repos: {
        get: jest.fn(),
      },
    })),
  };
});

describe('branch-resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveDefaultBranch', () => {
    it('should throw ConfigurationError if config branch does not exist and fallback disabled', async () => {
      await expect(
        resolveDefaultBranch({
          configBranch: 'origin/nonexistent',
          fallbackToGit: false,
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it('should fallback to origin/main if nothing found', async () => {
      const result = await resolveDefaultBranch({
        fallbackToGit: true,
      });

      expect(result.branch).toBe('origin/main');
      expect(result.source).toBe('fallback');
      expect(result.warning).toBeDefined();
    });
  });
});

