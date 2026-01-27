/**
 * Save Analysis Results Tool Handler
 * Handles the 'saveAnalysisResults' MCP tool
 * Single Responsibility: Persist analysis results to database
 */
import type { McpToolResponse } from '../types.js';
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
export declare class SaveResultsTool {
    private dashboardPort;
    constructor(dashboardPort?: number);
    execute(args: SaveResultsToolArgs): Promise<McpToolResponse>;
}
