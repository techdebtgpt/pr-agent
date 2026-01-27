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
    language?: string;
    framework?: string;
    enableStaticAnalysis?: boolean;
}
export interface AnalysisMode {
    summary: boolean;
    risks: boolean;
    complexity: boolean;
}
/**
 * Execution mode for LLM-agnostic operation
 */
export declare enum ExecutionMode {
    EXECUTE = "execute",// CLI: Execute prompts with API key
    PROMPT_ONLY = "prompt_only"
}
/**
 * Individual analysis prompt for PROMPT_ONLY mode
 * Supports both main PR analysis and peer review prompts
 */
export interface AnalysisPrompt {
    step: 'fileAnalysis' | 'riskDetection' | 'summaryGeneration' | 'selfRefinement' | 'ticketQuality' | 'acValidation' | 'peerReview';
    prompt: string;
    context?: Record<string, any>;
    instructions: string;
    schema?: any;
    formatInstructions?: string;
    inputs?: Record<string, unknown>;
}
/**
 * Result when in PROMPT_ONLY mode - returns prompts instead of executing them
 * Also includes static analysis results that don't require an LLM
 */
export interface PromptOnlyResult {
    mode: 'prompt_only';
    context: AgentContext;
    prompts: AnalysisPrompt[];
    instructions: string;
    staticAnalysis?: {
        testSuggestions?: TestSuggestion[];
        devOpsCostEstimates?: DevOpsCostEstimate[];
        coverageReport?: CoverageReport;
        projectClassification?: string;
    };
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
    isEnhancement?: boolean;
    existingTestFile?: string;
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
export interface Fix {
    file: string;
    line?: number;
    comment: string;
    severity?: 'critical' | 'warning' | 'suggestion';
    source?: 'semgrep' | 'ai';
}
export interface AgentResult {
    summary: string;
    fileAnalyses: Map<string, FileAnalysis>;
    fixes: Fix[];
    recommendations: string[];
    insights: string[];
    reasoning: string[];
    provider: string;
    model: string;
    totalTokensUsed: number;
    executionTime: number;
    mode: AnalysisMode;
    overallComplexity?: number;
    overallRisks?: string[];
    archDocsImpact?: {
        used: boolean;
        docsAvailable: number;
        sectionsUsed: number;
        influencedStages: string[];
        keyInsights: string[];
    };
    staticAnalysis?: {
        enabled: boolean;
        totalFindings: number;
        errorCount: number;
        warningCount: number;
        criticalIssues: string[];
    };
    testSuggestions?: TestSuggestion[];
    devOpsCostEstimates?: DevOpsCostEstimate[];
    coverageReport?: CoverageReport;
    projectClassification?: string;
}
/**
 * Union type for agent results - either executed results or prompts to execute
 */
export type AgentResultOrPrompts = AgentResult | PromptOnlyResult;
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
