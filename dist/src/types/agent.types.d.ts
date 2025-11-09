export interface DiffFile {
    path: string;
    additions: number;
    deletions: number;
    diff: string;
    language?: string;
    status?: 'A' | 'M' | 'D' | 'R';
    oldPath?: string;
}
export interface AgentContext {
    diff: string;
    title?: string;
    files: DiffFile[];
    repository?: string;
    prNumber?: number;
    tokenBudget: number;
    maxCost: number;
    mode: AnalysisMode;
    config?: Record<string, unknown>;
}
export interface AnalysisMode {
    summary: boolean;
    risks: boolean;
    complexity: boolean;
}
export interface FileAnalysis {
    path: string;
    summary: string;
    risks: string[];
    complexity: number;
    changes: {
        additions: number;
        deletions: number;
    };
    recommendations: string[];
}
export interface AgentResult {
    summary: string;
    fileAnalyses: Map<string, FileAnalysis>;
    overallComplexity: number;
    overallRisks: string[];
    recommendations: string[];
    insights: string[];
    reasoning: string[];
    provider: string;
    model: string;
    totalTokensUsed: number;
    executionTime: number;
    mode: AnalysisMode;
}
export type AgentAnalysisResult = AgentResult;
export interface AgentMetadata {
    name: string;
    version: string;
    description: string;
    capabilities: string[];
}
export interface AgentExecutionOptions {
    runnableConfig?: Record<string, unknown>;
    skipSelfRefinement?: boolean;
    maxQuestionsPerIteration?: number;
}
export declare enum AgentPriority {
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}
//# sourceMappingURL=agent.types.d.ts.map