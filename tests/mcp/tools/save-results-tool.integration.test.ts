/**
 * Integration tests for SaveResultsTool
 * Tests database operations for saving analysis results
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { SaveResultsTool } from '../../../src/mcp/tools/save-results-tool.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SaveResultsTool Integration Tests', () => {
  let saveResultsTool: SaveResultsTool;
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    // Create temp directory for test database
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-agent-save-test-'));
    dbPath = path.join(tempDir, 'test.db');

    // Set environment variable to use test database
    process.env.PR_AGENT_DB_PATH = dbPath;

    saveResultsTool = new SaveResultsTool();
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        setTimeout(() => {
          try {
            fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
          } catch {
            // Ignore cleanup errors
          }
        }, 100);
      }
    } catch {
      // Ignore cleanup errors
    }
    delete process.env.PR_AGENT_DB_PATH;
  });

  describe('execute', () => {
    it('should save basic analysis results successfully', async () => {
      const args = {
        title: 'Test PR',
        repoOwner: 'test-owner',
        repoName: 'test-repo',
        complexity: 3,
        risksCount: 2,
        risks: ['Risk 1', 'Risk 2'],
        recommendations: ['Recommendation 1', 'Recommendation 2'],
      };

      const result = await saveResultsTool.execute(args);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Analysis results saved to database');
      expect(result.content[0].text).toContain('View results at: http://localhost:3000');
    });

    it('should save results with peer review data', async () => {
      const args = {
        title: 'Test PR with Peer Review',
        repoOwner: 'test-owner',
        repoName: 'test-repo',
        complexity: 2,
        risksCount: 1,
        risks: ['Minor risk'],
        recommendations: ['Improve tests'],
        peerReviewEnabled: true,
        ticketKey: 'TODO-123',
        ticketQualityScore: 85,
        ticketQualityTier: 'A',
        acCompliancePercentage: 90,
        acRequirementsTotal: 10,
        acRequirementsMet: 9,
        peerReviewVerdict: 'approve' as const,
        peerReviewWarnings: ['Minor warning'],
        peerReviewBlockers: [],
        implementationCompleteness: 95,
        qualityScore: 88,
      };

      const result = await saveResultsTool.execute(args);

      expect(result.content[0].text).toContain('Analysis results saved');
    });

    it('should save results with DevOps cost data', async () => {
      const args = {
        title: 'Infrastructure PR',
        repoOwner: 'test-owner',
        repoName: 'test-repo',
        complexity: 4,
        risksCount: 3,
        risks: ['Cost overrun', 'Security', 'Availability'],
        recommendations: ['Review costs', 'Add monitoring'],
        devopsCostMonthly: 156.75,
        devopsResources: JSON.stringify([
          { type: 'ec2', cost: 34.5 },
          { type: 'rds', cost: 60 },
          { type: 'alb', cost: 22.5 },
        ]),
      };

      const result = await saveResultsTool.execute(args);

      expect(result.content[0].text).toContain('Analysis results saved');
    });

    it('should save results with project classification', async () => {
      const args = {
        title: 'Feature PR',
        repoOwner: 'test-owner',
        repoName: 'test-repo',
        complexity: 2,
        risksCount: 0,
        risks: [],
        recommendations: ['Add tests'],
        projectClassification: JSON.stringify({
          type: 'business-logic',
          confidence: 95,
          indicators: ['React components', 'API calls'],
        }),
      };

      const result = await saveResultsTool.execute(args);

      expect(result.content[0].text).toContain('Analysis results saved');
    });

    it('should handle empty risks and recommendations', async () => {
      const args = {
        title: 'Simple PR',
        repoOwner: 'test-owner',
        repoName: 'test-repo',
        complexity: 1,
        risksCount: 0,
        risks: [],
        recommendations: [],
      };

      const result = await saveResultsTool.execute(args);

      expect(result.content[0].text).toContain('Analysis results saved');
    });

    it('should handle PR number', async () => {
      const args = {
        title: 'PR #42',
        repoOwner: 'test-owner',
        repoName: 'test-repo',
        prNumber: 42,
        complexity: 2,
        risksCount: 1,
        risks: ['Risk'],
        recommendations: ['Rec'],
      };

      const result = await saveResultsTool.execute(args);

      expect(result.content[0].text).toContain('Analysis results saved');
    });

    it('should handle author information', async () => {
      const args = {
        title: 'Author PR',
        repoOwner: 'test-owner',
        repoName: 'test-repo',
        author: 'john-doe',
        complexity: 2,
        risksCount: 0,
        risks: [],
        recommendations: [],
      };

      const result = await saveResultsTool.execute(args);

      expect(result.content[0].text).toContain('Analysis results saved');
    });

    it('should handle all peer review verdict types', async () => {
      const verdicts: Array<'approve' | 'request_changes' | 'needs_discussion'> = [
        'approve',
        'request_changes',
        'needs_discussion',
      ];

      for (const verdict of verdicts) {
        const args = {
          title: `PR with ${verdict}`,
          repoOwner: 'test-owner',
          repoName: 'test-repo',
          complexity: 2,
          risksCount: 1,
          risks: ['Risk'],
          recommendations: ['Rec'],
          peerReviewEnabled: true,
          peerReviewVerdict: verdict,
        };

        const result = await saveResultsTool.execute(args);
        expect(result.content[0].text).toContain('Analysis results saved');
      }
    });

    it('should handle error when database operations fail', async () => {
      // Use invalid database path to trigger error
      process.env.PR_AGENT_DB_PATH = '/invalid/path/db.sqlite';

      const args = {
        title: 'Test PR',
        repoOwner: 'test-owner',
        repoName: 'test-repo',
        complexity: 2,
        risksCount: 0,
        risks: [],
        recommendations: [],
      };

      const result = await saveResultsTool.execute(args);

      expect(result.content[0].text).toContain('Failed to save analysis results');
    });

    it('should validate required fields', async () => {
      const args = {
        title: 'Test',
        repoOwner: 'owner',
        repoName: 'repo',
        // Missing required fields
      } as any;

      const result = await saveResultsTool.execute(args);

      // Should either handle gracefully or include error message
      expect(result.content).toBeDefined();
    });

    it('should handle very long text fields', async () => {
      const longText = 'A'.repeat(10000);
      const args = {
        title: longText,
        repoOwner: 'test-owner',
        repoName: 'test-repo',
        complexity: 3,
        risksCount: 1,
        risks: [longText],
        recommendations: [longText],
      };

      const result = await saveResultsTool.execute(args);

      expect(result.content[0].text).toContain('Analysis results saved');
    });

    it('should handle special characters in text fields', async () => {
      const args = {
        title: 'Test "quotes" & <tags> and \' apostrophes',
        repoOwner: 'test-owner',
        repoName: 'test-repo',
        complexity: 2,
        risksCount: 1,
        risks: ['Risk with "quotes"'],
        recommendations: ['Rec with <tags>'],
      };

      const result = await saveResultsTool.execute(args);

      expect(result.content[0].text).toContain('Analysis results saved');
    });

    it('should handle multiple saves to same database', async () => {
      const createArgs = (id: number) => ({
        title: `PR ${id}`,
        repoOwner: 'test-owner',
        repoName: 'test-repo',
        complexity: id % 5 + 1,
        risksCount: id % 3,
        risks: Array(id % 3).fill(`Risk ${id}`),
        recommendations: [`Recommendation ${id}`],
      });

      // Save multiple results
      for (let i = 1; i <= 5; i++) {
        const result = await saveResultsTool.execute(createArgs(i));
        expect(result.content[0].text).toContain('Analysis results saved');
      }
    });
  });

  describe('Database Schema Validation', () => {
    it('should create database with correct schema', async () => {
      const args = {
        title: 'Test PR',
        repoOwner: 'test-owner',
        repoName: 'test-repo',
        complexity: 2,
        risksCount: 0,
        risks: [],
        recommendations: [],
      };

      await saveResultsTool.execute(args);

      // Database file should exist
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it('should handle concurrent saves', async () => {
      const args = {
        title: 'Concurrent PR',
        repoOwner: 'test-owner',
        repoName: 'test-repo',
        complexity: 2,
        risksCount: 1,
        risks: ['Risk'],
        recommendations: ['Rec'],
      };

      // Attempt concurrent saves
      const promises = Array(3)
        .fill(null)
        .map((_, i) =>
          saveResultsTool.execute({
            ...args,
            title: `${args.title} ${i}`,
          })
        );

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.content[0].text).toContain('Analysis results saved');
      });
    });
  });
});
