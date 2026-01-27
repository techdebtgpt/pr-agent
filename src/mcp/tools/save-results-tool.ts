/**
 * Save Analysis Results Tool Handler
 * Handles the 'saveAnalysisResults' MCP tool
 * Single Responsibility: Persist analysis results to database
 */

import { saveAnalysis } from '../../db/index.js';
import type { McpToolResponse } from '../types.js';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, DEFAULT_DASHBOARD_PORT } from '../constants.js';

export interface SaveResultsToolArgs {
  prNumber?: number;
  title: string;
  repoOwner?: string;
  repoName?: string;
  author?: string;
  complexity: number;
  risksCount: number;
  risks: string[];
  recommendations: string[];
  projectClassification?: string;
  peerReviewEnabled?: boolean;
  ticketKey?: string;
  ticketQualityScore?: number;
  ticketQualityTier?: string;
  acCompliancePercentage?: number;
  acRequirementsMet?: number;
  acRequirementsTotal?: number;
  peerReviewVerdict?: string;
  peerReviewBlockers?: string[];
  peerReviewWarnings?: string[];
  implementationCompleteness?: number;
  qualityScore?: number;
  devopsCostMonthly?: number;
  devopsResources?: string;
}

export class SaveResultsTool {
  private dashboardPort: number;

  constructor(dashboardPort: number = DEFAULT_DASHBOARD_PORT) {
    this.dashboardPort = dashboardPort;
  }

  async execute(args: SaveResultsToolArgs): Promise<McpToolResponse> {
    try {
      saveAnalysis({
        pr_number: args.prNumber || Math.floor(Date.now() / 1000) % 100000,
        repo_owner: args.repoOwner || 'local',
        repo_name: args.repoName || 'unknown',
        author: args.author || 'unknown',
        title: args.title,
        complexity: args.complexity,
        risks_count: args.risksCount,
        risks: JSON.stringify(args.risks),
        recommendations: JSON.stringify(args.recommendations),
        project_classification: args.projectClassification,
        peer_review_enabled: args.peerReviewEnabled ? 1 : 0,
        ticket_key: args.ticketKey,
        ticket_quality_score: args.ticketQualityScore,
        ticket_quality_tier: args.ticketQualityTier,
        ac_compliance_percentage: args.acCompliancePercentage,
        ac_requirements_met: args.acRequirementsMet,
        ac_requirements_total: args.acRequirementsTotal,
        peer_review_verdict: args.peerReviewVerdict,
        peer_review_blockers: args.peerReviewBlockers
          ? JSON.stringify(args.peerReviewBlockers)
          : undefined,
        peer_review_warnings: args.peerReviewWarnings
          ? JSON.stringify(args.peerReviewWarnings)
          : undefined,
        implementation_completeness: args.implementationCompleteness,
        quality_score: args.qualityScore,
        devops_cost_monthly: args.devopsCostMonthly,
        devops_resources: args.devopsResources,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: SUCCESS_MESSAGES.ANALYSIS_SAVED(this.dashboardPort),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: ERROR_MESSAGES.SAVE_FAILED(error.message),
          },
        ],
      };
    }
  }
}
