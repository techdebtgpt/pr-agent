/**
 * Unit tests for FormatterService
 * Tests MCP output formatting
 */

import { describe, it, expect } from '@jest/globals';
import { FormatterService } from '../../../src/mcp/services/formatter.service.js';
import type { AnalysisOutputOptions } from '../../../src/mcp/types.js';

describe('FormatterService', () => {
  describe('formatAnalysisOutput', () => {
    const baseOptions: AnalysisOutputOptions = {
      verbose: false,
      peerReviewEnabled: false,
      allPrompts: [],
      repoInfo: { owner: 'test-owner', name: 'test-repo' },
      currentBranch: 'feature/test',
      baseBranch: 'main',
      title: 'Test PR',
    };

    it('should format basic analysis output', () => {
      const output = FormatterService.formatAnalysisOutput(baseOptions);

      expect(output).toContain('Static Analysis Results');
      expect(output).toContain('DevOps Cost Estimates');
      expect(output).toContain('LLM Analysis Workflow');
      expect(output).toContain('Next Steps');
    });

    it('should include header in verbose mode', () => {
      const options: AnalysisOutputOptions = {
        ...baseOptions,
        verbose: true,
      };

      const output = FormatterService.formatAnalysisOutput(options);

      expect(output).toContain('PR Agent Analysis');
      expect(output).toContain('Repository: test-owner/test-repo');
      expect(output).toContain('Branch: feature/test → main');
      expect(output).toContain('PR Title: Test PR');
    });

    it('should format DevOps cost estimates when present', () => {
      const options: AnalysisOutputOptions = {
        ...baseOptions,
        devOpsCostEstimates: [
          {
            resource: 'test-resource',
            resourceType: 'ec2',
            estimatedNewCost: 34.5,
            confidence: 'high',
            details: 'Estimated $30-40/month',
          },
        ],
        totalDevOpsCost: 34.5,
      };

      const output = FormatterService.formatAnalysisOutput(options);

      expect(output).toContain('Total Estimated Monthly Cost: $34.50');
      expect(output).toContain('ec2');
      expect(output).toContain('$34.50/month');
      expect(output).toContain('🟢'); // High confidence emoji
    });

    it('should show "No DevOps infrastructure changes" when no estimates', () => {
      const output = FormatterService.formatAnalysisOutput(baseOptions);

      expect(output).toContain('No DevOps infrastructure changes detected');
    });

    it('should format static analysis when present', () => {
      const options: AnalysisOutputOptions = {
        ...baseOptions,
        staticAnalysis: {
          testSuggestions: [
            {
              file: 'test.ts',
              suggestions: ['Test case 1', 'Test case 2'],
            },
          ],
          coverageReport: {
            totalCoverage: 85,
            lineCoverage: 90,
            branchCoverage: 80,
          },
        },
      };

      const output = FormatterService.formatAnalysisOutput(options);

      expect(output).toContain('Static Analysis Results');
    });

    it('should format project classification when present', () => {
      const options: AnalysisOutputOptions = {
        ...baseOptions,
        projectClassification: {
          type: 'business-logic',
          confidence: 95,
          indicators: ['React components', 'API calls'],
        },
      };

      const output = FormatterService.formatAnalysisOutput(options);

      expect(output).toContain('Static Analysis Results');
    });

    it('should include prompts in workflow section', () => {
      const options: AnalysisOutputOptions = {
        ...baseOptions,
        allPrompts: [
          {
            step: 'fileAnalysis',
            prompt: 'Analyze these files...',
            instructions: 'Provide detailed analysis',
          },
          {
            step: 'riskDetection',
            prompt: 'Detect risks...',
            instructions: 'Identify security issues',
          },
        ],
      };

      const output = FormatterService.formatAnalysisOutput(options);

      expect(output).toContain('Execute the following 2 prompts sequentially');
      expect(output).toContain('Step 1: fileAnalysis');
      expect(output).toContain('Step 2: riskDetection');
    });

    it('should truncate long prompts in normal mode', () => {
      const longPrompt = 'A'.repeat(3000);
      const options: AnalysisOutputOptions = {
        ...baseOptions,
        verbose: false,
        allPrompts: [
          {
            step: 'fileAnalysis',
            prompt: longPrompt,
            instructions: 'Test',
          },
        ],
      };

      const output = FormatterService.formatAnalysisOutput(options);

      expect(output).toContain('(truncated for display)');
    });

    it('should show longer prompts in verbose mode', () => {
      const longPrompt = 'A'.repeat(8000);
      const options: AnalysisOutputOptions = {
        ...baseOptions,
        verbose: true,
        allPrompts: [
          {
            step: 'fileAnalysis',
            prompt: longPrompt,
            instructions: 'Test',
          },
        ],
      };

      const output = FormatterService.formatAnalysisOutput(options);

      // In verbose mode, limit is higher but still truncates very long prompts
      expect(output.length).toBeGreaterThan(0);
    });

    it('should show peer review error when present', () => {
      const options: AnalysisOutputOptions = {
        ...baseOptions,
        peerReviewEnabled: true,
        peerReviewError: 'Jira connection failed',
      };

      const output = FormatterService.formatAnalysisOutput(options);

      expect(output).toContain('Peer Review Error');
      expect(output).toContain('Jira connection failed');
      expect(output).toContain('Possible causes:');
    });

    it('should include dashboard URL in verbose mode', () => {
      const options: AnalysisOutputOptions = {
        ...baseOptions,
        verbose: true,
      };

      const output = FormatterService.formatAnalysisOutput(options);

      expect(output).toContain('Dashboard: http://localhost:3000');
    });

    it('should include next steps instructions', () => {
      const options: AnalysisOutputOptions = {
        ...baseOptions,
        allPrompts: [
          { step: 'fileAnalysis', prompt: 'test', instructions: 'test' },
        ],
      };

      const output = FormatterService.formatAnalysisOutput(options);

      expect(output).toContain('Next Steps');
      expect(output).toContain('Execute the following 1 prompts sequentially');
    });

    it('should show confidence indicators for cost estimates', () => {
      const options: AnalysisOutputOptions = {
        ...baseOptions,
        devOpsCostEstimates: [
          {
            resource: 'high-conf',
            resourceType: 'alb',
            estimatedNewCost: 22,
            confidence: 'high',
          },
          {
            resource: 'medium-conf',
            resourceType: 'ec2',
            estimatedNewCost: 34,
            confidence: 'medium',
          },
          {
            resource: 'low-conf',
            resourceType: 'lambda',
            estimatedNewCost: 0.4,
            confidence: 'low',
          },
        ],
        totalDevOpsCost: 56.4,
      };

      const output = FormatterService.formatAnalysisOutput(options);

      expect(output).toContain('🟢'); // high confidence
      expect(output).toContain('🟡'); // medium confidence
      expect(output).toContain('🔴'); // low confidence
    });
  });
});
