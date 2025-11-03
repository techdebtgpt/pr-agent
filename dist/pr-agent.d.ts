/**
 * PR Analysis Agent
 * A true agent that reasons, plans, and iteratively analyzes PRs
 * - Makes autonomous decisions about what to analyze
 * - Uses tools to perform analysis
 * - Iteratively refines understanding
 * - Adapts strategy based on findings
 */
import { AIProviderConfig, AnalysisResponse } from './providers/types';
export interface DiffFile {
    path: string;
    additions: number;
    deletions: number;
    diff: string;
    language?: string;
    status?: 'A' | 'M' | 'D' | 'R';
    oldPath?: string;
}
export interface AnalysisMode {
    summary: boolean;
    risks: boolean;
    complexity: boolean;
}
export interface AgentState {
    analyzedFiles: Map<string, AnalysisResponse>;
    pendingFiles: DiffFile[];
    context: string[];
    insights: string[];
    risks: Set<string>;
    questions: string[];
    strategy: 'comprehensive' | 'focused' | 'deep-dive';
    mode?: AnalysisMode;
}
export interface AgentTool {
    name: string;
    description: string;
    execute: (params: any, state: AgentState) => Promise<any>;
}
export interface AgentAnalysisResult {
    summary: string;
    fileAnalyses: Map<string, AnalysisResponse>;
    overallComplexity: number;
    overallRisks: string[];
    recommendations: string[];
    insights: string[];
    reasoning: string[];
    provider: string;
    model: string;
    totalTokensUsed?: number;
    mode?: AnalysisMode;
}
export declare class PRAnalysisAgent {
    private provider;
    private anthropic;
    private apiKey;
    private state;
    private tools;
    private githubApi?;
    private repository?;
    constructor(config: AIProviderConfig, apiKey: string, githubApi?: any, repository?: {
        owner: string;
        repo: string;
        baseSha?: string;
        headSha?: string;
    });
    /**
     * Register available tools for the agent
     */
    private registerTools;
    /**
     * Parse AI response - extracts sections based on the expected format
     * Handles both terminal (plain text) and markdown formats
     */
    private parseResponse;
    /**
     * Extract JSON from markdown code blocks
     */
    private extractJSON;
    /**
     * Agent reasoning - uses Claude to make decisions
     */
    private reason;
    /**
     * Calculate priority score for a file
     */
    private calculatePriorityScore;
    /**
     * Check if a file should be skipped from analysis
     */
    private shouldSkipFile;
    /**
     * Parse diff into individual files
     * Detects new, modified, and deleted files
     */
    parseDiff(diff: string): DiffFile[];
    /**
     * Detect programming language from file extension
     */
    private detectLanguage;
    /**
     * Get full file content from git (for new files)
     * Returns null if file doesn't exist or can't be read
     */
    private getFileContent;
    /**
     * Get deleted file content from git (for deleted files)
     * Returns null if file can't be read
     */
    private getDeletedFileContent;
    /**
     * Execute a tool
     */
    private executeTool;
    /**
     * Agent planning phase - decides strategy
     */
    private planStrategy;
    /**
     * Main agent loop - reasons, plans, executes iteratively
     */
    analyze(diff: string, prTitle?: string, mode?: AnalysisMode, outputFormat?: 'terminal' | 'markdown'): Promise<AgentAnalysisResult>;
}
