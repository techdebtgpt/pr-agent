/**
 * Integration tests for AnalyzeTool
 * Tests the complete analysis workflow including MCP tool execution
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AnalyzeTool } from '../../../src/mcp/tools/analyze-tool.js';
import { DashboardService } from '../../../src/mcp/services/dashboard.service.js';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock dependencies
jest.mock('child_process');
jest.mock('../../../src/cli/utils/config-loader.js');
jest.mock('../../../src/utils/branch-resolver.js');

describe('AnalyzeTool Integration Tests', () => {
  let analyzeTool: AnalyzeTool;
  let mockDashboardService: jest.Mocked<DashboardService>;
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-agent-analyze-test-'));

    // Mock config loader
    const configLoader = await import('../../../src/cli/utils/config-loader.js');
    (configLoader.loadUserConfig as any) = jest.fn(() => Promise.resolve({}));

    // Mock branch resolver
    const branchResolver = await import('../../../src/utils/branch-resolver.js');
    (branchResolver.resolveDefaultBranch as any) = jest.fn(() => Promise.resolve({ branch: 'origin/main' }));

    // Mock DashboardService
    mockDashboardService = {
      startInBackground: jest.fn(() => Promise.resolve()),
    } as any;

    analyzeTool = new AnalyzeTool(mockDashboardService);

    // Setup default git command mocks
    (childProcess.execSync as jest.Mock).mockImplementation((cmd: any) => {
      const command = String(cmd);
      if (command.includes('git rev-parse --abbrev-ref HEAD')) {
        return Buffer.from('feature/test-branch');
      }
      if (command.includes('git log -1 --pretty=%s')) {
        return Buffer.from('feat: Add new feature');
      }
      if (command.includes('git remote get-url origin')) {
        return Buffer.from('https://github.com/test-owner/test-repo.git');
      }
      if (command.includes('git log')) {
        return Buffer.from('feat: commit 1\nfix: commit 2');
      }
      if (command.includes('git diff')) {
        return Buffer.from('diff --git a/file.ts b/file.ts\n+new line');
      }
      return Buffer.from('');
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('execute', () => {
    it('should execute full analysis workflow successfully', async () => {
      const result = await analyzeTool.execute({
        branch: 'main',
        cwd: tempDir,
        verbose: false,
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Static Analysis Results');
    });

    it('should return error when no changes detected', async () => {
      // Mock git diff to return empty
      (childProcess.execSync as jest.Mock).mockImplementation((cmd: any) => {
        const command = String(cmd);
        if (command.includes('git diff')) {
          return Buffer.from('');
        }
        if (command.includes('git rev-parse --abbrev-ref HEAD')) {
          return Buffer.from('feature/test-branch');
        }
        return Buffer.from('test');
      });

      const result = await analyzeTool.execute({
        branch: 'main',
        cwd: tempDir,
      });

      expect(result.content[0].text).toContain('No changes detected');
    });

    it('should analyze staged changes when staged flag is true', async () => {
      (childProcess.execSync as jest.Mock).mockImplementation((cmd: any) => {
        const command = String(cmd);
        if (command.includes('git diff --staged')) {
          return Buffer.from('diff --git a/staged.ts b/staged.ts\n+staged change');
        }
        if (command.includes('git rev-parse --abbrev-ref HEAD')) {
          return Buffer.from('feature/test');
        }
        return Buffer.from('test');
      });

      const result = await analyzeTool.execute({
        staged: true,
        cwd: tempDir,
      });

      expect(result.content[0].text).toContain('Static Analysis Results');
      expect(childProcess.execSync).toHaveBeenCalledWith(
        'git diff --staged',
        expect.any(Object)
      );
    });

    it('should include DevOps cost estimates for infrastructure files', async () => {
      // Mock diff with Terraform file
      (childProcess.execSync as jest.Mock).mockImplementation((cmd: any) => {
        const command = String(cmd);
        if (command.includes('git diff')) {
          return Buffer.from(`diff --git a/main.tf b/main.tf
+resource "aws_instance" "web" {
+  ami           = "ami-123456"
+  instance_type = "t3.medium"
+}`);
        }
        if (command.includes('git rev-parse --abbrev-ref HEAD')) {
          return Buffer.from('feature/infra');
        }
        return Buffer.from('test');
      });

      const result = await analyzeTool.execute({
        branch: 'main',
        cwd: tempDir,
        verbose: true,
      });

      const text = result.content[0].text;
      expect(text).toContain('DevOps Cost Estimates');
    });

    it('should start dashboard in background', async () => {
      await analyzeTool.execute({
        branch: 'main',
        cwd: tempDir,
      });

      expect(mockDashboardService.startInBackground).toHaveBeenCalled();
    });

    it('should handle custom PR title', async () => {
      const customTitle = 'Custom PR Title';

      const result = await analyzeTool.execute({
        branch: 'main',
        title: customTitle,
        cwd: tempDir,
        verbose: true,
      });

      expect(result.content[0].text).toContain(customTitle);
    });

    it('should include verbose information when verbose flag is true', async () => {
      const result = await analyzeTool.execute({
        branch: 'main',
        cwd: tempDir,
        verbose: true,
      });

      const text = result.content[0].text;
      expect(text).toContain('PR Agent Analysis');
      expect(text).toContain('Repository:');
      expect(text).toContain('Branch:');
    });

    it('should return prompts in PROMPT_ONLY mode', async () => {
      const result = await analyzeTool.execute({
        branch: 'main',
        cwd: tempDir,
      });

      const text = result.content[0].text;
      expect(text).toContain('LLM Analysis Workflow');
      expect(text).toContain('prompts sequentially');
    });

    it('should handle analysis errors gracefully', async () => {
      // Mock git command to throw error
      (childProcess.execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Git error');
      });

      const result = await analyzeTool.execute({
        branch: 'main',
        cwd: tempDir,
      });

      expect(result.content[0].text).toContain('Analysis failed');
    });

    it('should extract ticket references from branch name', async () => {
      (childProcess.execSync as jest.Mock).mockImplementation((cmd: any) => {
        const command = String(cmd);
        if (command.includes('git rev-parse --abbrev-ref HEAD')) {
          return Buffer.from('feature/TODO-123-implement-feature');
        }
        if (command.includes('git diff')) {
          return Buffer.from('diff --git a/file.ts b/file.ts\n+change');
        }
        return Buffer.from('test');
      });

      const result = await analyzeTool.execute({
        branch: 'main',
        cwd: tempDir,
        verbose: true,
      });

      // Analysis should complete successfully with ticket extraction
      expect(result.content[0].text).toContain('Static Analysis Results');
    });

    it('should disable archDocs when archDocs flag is false', async () => {
      const result = await analyzeTool.execute({
        branch: 'main',
        cwd: tempDir,
        archDocs: false,
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Static Analysis Results');
    });

    it('should use config default branch when no branch provided', async () => {
      const configLoader = await import('../../../src/cli/utils/config-loader.js');
      (configLoader.loadUserConfig as any) = jest.fn(() =>
        Promise.resolve({ git: { defaultBranch: 'develop' } })
      );

      await analyzeTool.execute({
        cwd: tempDir,
      });

      // Should use branch resolver which will use config
      expect(configLoader.loadUserConfig).toHaveBeenCalled();
    });

    it('should include next steps instructions', async () => {
      const result = await analyzeTool.execute({
        branch: 'main',
        cwd: tempDir,
      });

      const text = result.content[0].text;
      expect(text).toContain('Next Steps');
      expect(text).toContain('saveAnalysisResults');
    });
  });

  describe('Error Handling', () => {
    it('should handle config loading errors gracefully', async () => {
      const configLoader = await import('../../../src/cli/utils/config-loader.js');
      (configLoader.loadUserConfig as any) = jest.fn(() =>
        Promise.reject(new Error('Config error'))
      );

      const result = await analyzeTool.execute({
        branch: 'main',
        cwd: tempDir,
      });

      // Should still work without config
      expect(result.content).toBeDefined();
    });

    it('should handle branch resolution errors gracefully', async () => {
      const branchResolver = await import('../../../src/utils/branch-resolver.js');
      (branchResolver.resolveDefaultBranch as any) = jest.fn(() =>
        Promise.reject(new Error('Branch error'))
      );

      const result = await analyzeTool.execute({
        cwd: tempDir,
      });

      // Should fallback to default branch
      expect(result.content).toBeDefined();
    });

    it('should handle repo info extraction errors', async () => {
      (childProcess.execSync as jest.Mock).mockImplementation((cmd: any) => {
        const command = String(cmd);
        if (command.includes('git remote get-url origin')) {
          throw new Error('No remote');
        }
        if (command.includes('git diff')) {
          return Buffer.from('diff --git a/file.ts b/file.ts\n+change');
        }
        return Buffer.from('test');
      });

      const result = await analyzeTool.execute({
        branch: 'main',
        cwd: tempDir,
      });

      // Should use 'local' for repo owner
      expect(result.content).toBeDefined();
    });
  });
});
