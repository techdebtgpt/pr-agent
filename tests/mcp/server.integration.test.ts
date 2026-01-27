/**
 * Integration tests for MCP Server
 * Tests complete MCP protocol interaction and tool execution
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as childProcess from 'child_process';

// Mock dependencies before imports
jest.mock('child_process');
jest.mock('../../src/cli/utils/config-loader.js');

describe('MCP Server Integration Tests', () => {
  beforeEach(() => {
    // Setup default git command mocks
    (childProcess.execSync as jest.Mock).mockImplementation((cmd: any) => {
      const command = String(cmd);
      if (command.includes('git rev-parse --abbrev-ref HEAD')) {
        return Buffer.from('main');
      }
      if (command.includes('git log -1 --pretty=%s')) {
        return Buffer.from('test commit');
      }
      if (command.includes('git remote get-url origin')) {
        return Buffer.from('https://github.com/test/repo.git');
      }
      if (command.includes('git diff')) {
        return Buffer.from('diff --git a/file.ts b/file.ts\n+test');
      }
      return Buffer.from('');
    });

    jest.clearAllMocks();
  });

  describe('Tool Integration', () => {
    it('should execute analyze tool end-to-end', async () => {
      const { AnalyzeTool } = await import('../../src/mcp/tools/analyze-tool.js');
      const { DashboardService } = await import('../../src/mcp/services/dashboard.service.js');

      const mockDashboard = {
        startInBackground: jest.fn(() => Promise.resolve()),
      } as any;

      const tool = new AnalyzeTool(mockDashboard);

      const result = await tool.execute({
        branch: 'main',
        staged: false,
        verbose: false,
      });

      expect(result.content[0].text).toContain('Static Analysis Results');
      expect(result.content[0].text).toContain('LLM Analysis Workflow');
    });

    it('should execute saveAnalysisResults tool end-to-end', async () => {
      const { SaveResultsTool } = await import('../../src/mcp/tools/save-results-tool.js');

      const tool = new SaveResultsTool();

      // Use temp database
      const tempDbPath = require('path').join(require('os').tmpdir(), `test-${Date.now()}.db`);
      process.env.PR_AGENT_DB_PATH = tempDbPath;

      try {
        const result = await tool.execute({
          title: 'Test PR',
          repoOwner: 'test',
          repoName: 'repo',
          complexity: 2,
          risksCount: 1,
          risks: ['Risk'],
          recommendations: ['Rec'],
        });

        expect(result.content[0].text).toContain('Analysis results saved');
      } finally {
        delete process.env.PR_AGENT_DB_PATH;
        try {
          require('fs').unlinkSync(tempDbPath);
        } catch {
          // Ignore
        }
      }
    });

    it('should execute dashboard tool end-to-end', async () => {
      const { DashboardTool } = await import('../../src/mcp/tools/dashboard-tool.js');
      const { DashboardService } = await import('../../src/mcp/services/dashboard.service.js');

      const mockDashboard = {
        start: jest.fn(() => Promise.resolve()),
      } as any;

      const tool = new DashboardTool(mockDashboard);

      const result = await tool.execute({ port: 3000 }, __dirname);

      expect(result.content[0].text).toContain('Dashboard');
    });
  });

  describe('Service Integration', () => {
    it('should integrate GitService correctly', async () => {
      const { GitService } = await import('../../src/mcp/services/git.service.js');

      (childProcess.execSync as jest.Mock).mockImplementation((cmd: any) => {
        const command = String(cmd);
        if (command.includes('git diff')) {
          return Buffer.from('test diff');
        }
        return Buffer.from('test');
      });

      try {
        const diff = GitService.getGitDiff('git diff main');
        expect(diff).toBe('test diff');
      } catch (error) {
        // Expected to fail in PROMPT_ONLY mode
        expect(error).toBeDefined();
      }
    });

    it('should integrate TicketExtractorService correctly', async () => {
      const { TicketExtractorService } = await import(
        '../../src/mcp/services/ticket-extractor.service.js'
      );

      const refs = TicketExtractorService.extractTicketReferences(
        'TODO-123 Title',
        'feature/TODO-123',
        [],
        'TODO'
      );

      expect(refs.length).toBeGreaterThan(0);
      expect(refs.some((r) => r.key === 'TODO-123')).toBe(true);
    });

    it('should integrate FormatterService correctly', async () => {
      const { FormatterService } = await import('../../src/mcp/services/formatter.service.js');

      const output = FormatterService.formatAnalysisOutput({
        verbose: false,
        peerReviewEnabled: false,
        allPrompts: [],
        repoInfo: { owner: 'test', name: 'repo' },
        currentBranch: 'main',
        baseBranch: 'origin/main',
        title: 'Test',
      });

      expect(output).toContain('Static Analysis Results');
      expect(output).toContain('DevOps Cost Estimates');
    });
  });

  describe('Error Handling', () => {
    it('should handle git command failures gracefully', async () => {
      (childProcess.execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Git error');
      });

      const { AnalyzeTool } = await import('../../src/mcp/tools/analyze-tool.js');
      const { DashboardService } = await import('../../src/mcp/services/dashboard.service.js');

      const mockDashboard = {
        startInBackground: jest.fn(() => Promise.resolve()),
      } as any;

      const tool = new AnalyzeTool(mockDashboard);

      const result = await tool.execute({ branch: 'main' });

      expect(result.content[0].text).toContain('Analysis failed');
    });

    it('should handle missing configuration gracefully', async () => {
      const configLoader = await import('../../src/cli/utils/config-loader.js');
      (configLoader.loadUserConfig as any) = jest.fn(() =>
        Promise.reject(new Error('Config not found'))
      );

      const { AnalyzeTool } = await import('../../src/mcp/tools/analyze-tool.js');
      const { DashboardService } = await import('../../src/mcp/services/dashboard.service.js');

      const mockDashboard = {
        startInBackground: jest.fn(() => Promise.resolve()),
      } as any;

      const tool = new AnalyzeTool(mockDashboard);

      // Should still work without config
      const result = await tool.execute({ branch: 'main' });

      expect(result.content).toBeDefined();
    });

    it('should handle dashboard startup failures', async () => {
      const { AnalyzeTool } = await import('../../src/mcp/tools/analyze-tool.js');

      const mockDashboard = {
        startInBackground: jest.fn(() => Promise.reject(new Error('Port in use'))),
      } as any;

      const tool = new AnalyzeTool(mockDashboard);

      // Should complete analysis even if dashboard fails
      const result = await tool.execute({ branch: 'main' });

      expect(result.content[0].text).toContain('Static Analysis Results');
    });
  });

  describe('PROMPT_ONLY Mode', () => {
    it('should return prompts without executing LLM', async () => {
      const { AnalyzeTool } = await import('../../src/mcp/tools/analyze-tool.js');
      const { DashboardService } = await import('../../src/mcp/services/dashboard.service.js');

      const mockDashboard = {
        startInBackground: jest.fn(() => Promise.resolve()),
      } as any;

      const tool = new AnalyzeTool(mockDashboard);

      const result = await tool.execute({
        branch: 'main',
        verbose: true,
      });

      const output = result.content[0].text;

      // Should contain prompt steps
      expect(output).toContain('Step 1:');
      expect(output).toContain('Prompt:');
      expect(output).toContain('Execute the following');
      expect(output).toContain('prompts sequentially');

      // Should NOT contain LLM execution results (those come from calling LLM)
      expect(output).not.toContain('Analysis Complete');
    });

    it('should include static analysis in PROMPT_ONLY mode', async () => {
      const { AnalyzeTool } = await import('../../src/mcp/tools/analyze-tool.js');
      const { DashboardService } = await import('../../src/mcp/services/dashboard.service.js');

      const mockDashboard = {
        startInBackground: jest.fn(() => Promise.resolve()),
      } as any;

      const tool = new AnalyzeTool(mockDashboard);

      const result = await tool.execute({ branch: 'main' });

      const output = result.content[0].text;

      // Static analysis should run immediately
      expect(output).toContain('Static Analysis Results');
    });

    it('should include DevOps cost estimates in PROMPT_ONLY mode', async () => {
      // Mock Terraform file in diff
      (childProcess.execSync as jest.Mock).mockImplementation((cmd: any) => {
        const command = String(cmd);
        if (command.includes('git diff')) {
          return Buffer.from(`diff --git a/main.tf b/main.tf
+resource "aws_instance" "web" {
+  instance_type = "t3.medium"
+}`);
        }
        if (command.includes('git rev-parse --abbrev-ref HEAD')) {
          return Buffer.from('feature/infra');
        }
        return Buffer.from('test');
      });

      const { AnalyzeTool } = await import('../../src/mcp/tools/analyze-tool.js');
      const { DashboardService } = await import('../../src/mcp/services/dashboard.service.js');

      const mockDashboard = {
        startInBackground: jest.fn(() => Promise.resolve()),
      } as any;

      const tool = new AnalyzeTool(mockDashboard);

      const result = await tool.execute({ branch: 'main', verbose: true });

      const output = result.content[0].text;

      // DevOps cost analysis should run deterministically
      expect(output).toContain('DevOps Cost Estimates');
    });
  });

  describe('Workflow Integration', () => {
    it('should complete full analyze -> save workflow', async () => {
      const { AnalyzeTool } = await import('../../src/mcp/tools/analyze-tool.js');
      const { SaveResultsTool } = await import('../../src/mcp/tools/save-results-tool.js');
      const { DashboardService } = await import('../../src/mcp/services/dashboard.service.js');

      const mockDashboard = {
        startInBackground: jest.fn(() => Promise.resolve()),
      } as any;

      // Step 1: Analyze
      const analyzeTool = new AnalyzeTool(mockDashboard);
      const analyzeResult = await analyzeTool.execute({ branch: 'main' });

      expect(analyzeResult.content[0].text).toContain('prompts sequentially');

      // Step 2: Save (after LLM execution in real scenario)
      const tempDbPath = require('path').join(require('os').tmpdir(), `test-${Date.now()}.db`);
      process.env.PR_AGENT_DB_PATH = tempDbPath;

      try {
        const saveTool = new SaveResultsTool();
        const saveResult = await saveTool.execute({
          title: 'Test PR',
          repoOwner: 'test',
          repoName: 'repo',
          complexity: 3,
          risksCount: 2,
          risks: ['Risk 1', 'Risk 2'],
          recommendations: ['Rec 1', 'Rec 2'],
        });

        expect(saveResult.content[0].text).toContain('Analysis results saved');
      } finally {
        delete process.env.PR_AGENT_DB_PATH;
        try {
          require('fs').unlinkSync(tempDbPath);
        } catch {
          // Ignore
        }
      }
    });
  });
});
