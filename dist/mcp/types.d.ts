/**
 * MCP Server Types
 * Type definitions specific to the MCP server implementation
 */
import type { AnalysisPrompt } from '../types/agent.types.js';
/**
 * Repository information extracted from git remote
 */
export interface RepoInfo {
    owner: string;
    name: string;
}
/**
 * Git diff file metadata
 */
export interface DiffFileMetadata {
    path: string;
    additions: number;
    deletions: number;
    status: 'added' | 'deleted' | 'modified';
}
/**
 * Ticket reference extracted from PR metadata
 */
export interface TicketReference {
    key: string;
    source: 'title' | 'branch' | 'commit' | 'description';
    confidence: number;
}
/**
 * Dashboard statistics
 */
export interface DashboardStats {
    totalAnalyses: number;
    averageComplexity: number;
    criticalRisks: number;
    recentActivity: Array<{
        date: string;
        count: number;
    }>;
}
/**
 * MCP Tool Response format
 * Matches the MCP SDK's expected return type with index signature
 */
export interface McpToolResponse {
    [x: string]: unknown;
    content: Array<{
        type: 'text';
        text: string;
    }>;
}
/**
 * Analysis output formatting options
 */
export interface AnalysisOutputOptions {
    verbose: boolean;
    peerReviewEnabled: boolean;
    peerReviewError?: string;
    allPrompts: AnalysisPrompt[];
    staticAnalysis?: any;
    devOpsCostEstimates?: Array<{
        resource: string;
        resourceType: string;
        estimatedNewCost: number;
        confidence: 'high' | 'medium' | 'low';
        details?: string;
    }>;
    totalDevOpsCost?: number;
    projectClassification?: any;
    repoInfo: RepoInfo;
    currentBranch: string;
    baseBranch?: string;
    title?: string;
}
/**
 * Dashboard server state
 */
export interface DashboardServerState {
    httpServer: any | null;
    port: number | null;
}
/**
 * Git operation options
 */
export interface GitOperationOptions {
    cwd?: string;
    maxBuffer?: number;
}
/**
 * Peer review analysis context
 */
export interface PeerReviewContext {
    config: any;
    diff: string;
    title: string | undefined;
    prAnalysisResult: any;
    verbose: boolean;
    workDir: string;
}
