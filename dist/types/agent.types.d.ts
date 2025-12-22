/**
 * Agent types and interfaces for PR Agent
 * Following architecture-doc-generator patterns
 */
export interface DiffFile {
    path: string;
    additions: number;
    deletions: number;
    diff: string;
    language?: string;
    status?: 'A' | 'M' | 'D' | 'R';
    oldPath?: string;
}
export interface ArchDocsContext {
    available: boolean;
    summary: string;
    relevantDocs: Array<{
        filename: string;
        title: string;
        section: string;
        content: string;
        relevance: number;
    }>;
    totalDocs: number;
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
    archDocs?: ArchDocsContext;
}
export interface AnalysisMode {
    summary: boolean;
    risks: boolean;
    complexity: boolean;
}
export interface RiskItem {
    description: string;
    archDocsReference?: {
        source: string;
        excerpt: string;
        reason: string;
    };
}
/**
 * Code suggestion for fixing issues found during review
 */
export interface CodeSuggestion {
    filePath: string;
    lineRange: {
        start: number;
        end: number;
    };
    originalCode: string;
    suggestedCode: string;
    reason: string;
}
/**
 * Test suggestion for code without tests
 */
export interface TestSuggestion {
    forFile: string;
    testFramework: 'jest' | 'mocha' | 'vitest' | 'pytest' | 'unittest' | 'other';
    testCode: string;
    description: string;
    testFilePath?: string;
}
/**
 * DevOps cost estimate for infrastructure changes
 */
export interface DevOpsCostEstimate {
    resource: string;
    resourceType: string;
    currentMonthlyCost?: number;
    estimatedNewCost: number;
    difference?: number;
    confidence: 'high' | 'medium' | 'low';
    details?: string;
}
/**
 * Test coverage report
 */
export interface CoverageReport {
    available: boolean;
    overallPercentage?: number;
    lineCoverage?: number;
    branchCoverage?: number;
    fileBreakdown?: Array<{
        file: string;
        lineCoverage: number;
        branchCoverage?: number;
    }>;
    delta?: number;
    coverageTool?: string;
}
export interface FileAnalysis {
    path: string;
    summary: string;
    risks: string[] | RiskItem[];
    complexity: number;
    changes: {
        additions: number;
        deletions: number;
    };
    recommendations: string[];
    suggestedChanges?: CodeSuggestion[];
}
export interface AgentResult {
    summary: string;
    fileAnalyses: Map<string, FileAnalysis>;
    overallComplexity: number;
    overallRisks: string[] | RiskItem[];
    recommendations: string[];
    insights: string[];
    reasoning: string[];
    provider: string;
    model: string;
    totalTokensUsed: number;
    executionTime: number;
    mode: AnalysisMode;
    archDocsImpact?: {
        used: boolean;
        docsAvailable: number;
        sectionsUsed: number;
        influencedStages: string[];
        keyInsights: string[];
    };
    testSuggestions?: TestSuggestion[];
    devOpsCostEstimates?: DevOpsCostEstimate[];
    coverageReport?: CoverageReport;
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
