/**
 * Peer Review Service
 * Orchestrates peer review analysis with Jira integration
 * Single Responsibility: Peer review workflow coordination
 */

import { execSync } from 'child_process';
import {
  createPeerReviewIntegration,
  PeerReviewMode,
  type PeerReviewResult,
} from '../../issue-tracker/index.js';
import type { PeerReviewContext } from '../types.js';
import { DiffParserService } from './diff-parser.service.js';

export class PeerReviewService {
  /**
   * Run peer review analysis in PROMPT_ONLY mode
   * Returns prompts for the calling LLM to execute
   */
  static async runPeerReview(context: PeerReviewContext): Promise<PeerReviewResult | null> {
    try {
      // Use PROMPT_ONLY mode - no LLM needed, returns prompts for calling LLM to execute
      const peerReviewConfig = context.config.peerReview || {};
      const integration = createPeerReviewIntegration(
        peerReviewConfig,
        PeerReviewMode.PROMPT_ONLY
      );

      if (!integration.isEnabled()) {
        console.error('[MCP Server] Peer Review enabled but not configured');
        if (context.verbose) {
          console.error('[MCP Server] Set peerReview.useMcp=true in config');
        }
        return null;
      }

      // Get branch name for ticket extraction
      let branchName: string | undefined;
      try {
        branchName = execSync('git rev-parse --abbrev-ref HEAD', {
          encoding: 'utf-8',
          cwd: context.workDir,
          shell: true,
        } as any).trim();
      } catch {
        // Ignore - branch name is optional
      }

      // Get commit messages for ticket extraction
      let commitMessages: string[] = [];
      try {
        const commits = execSync('git log --oneline -10', {
          encoding: 'utf-8',
          cwd: context.workDir,
          shell: true,
        } as any);
        commitMessages = commits.trim().split('\n');
      } catch {
        // Ignore
      }

      // Parse diff to get file info
      const files = DiffParserService.parseDiffFiles(context.diff);

      console.error('[MCP Server] Running peer review analysis...');

      // Run peer review analysis
      const result = await integration.analyze({
        prTitle: context.title || 'Untitled PR',
        prDescription: undefined,
        branchName,
        commitMessages,
        diff: context.diff,
        files,
        prSummary: context.prAnalysisResult.summary,
        prRisks: context.prAnalysisResult.overallRisks,
        prComplexity: context.prAnalysisResult.overallComplexity,
      });

      console.error('[MCP Server] Peer review analysis complete');
      return result;
    } catch (error: any) {
      console.error('[MCP Server] Peer review failed:', error.message);
      if (context.verbose) {
        console.error('[MCP Server] Error details:', error.stack);
      }
      return null;
    }
  }
}
