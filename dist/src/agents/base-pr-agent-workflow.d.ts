import { MemorySaver } from '@langchain/langgraph';
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentContext, AgentResult, FileAnalysis, AgentExecutionOptions } from '../types/agent.types.js';
export declare const PRAgentState: import("@langchain/langgraph").AnnotationRoot<{
    context: import("@langchain/langgraph").BinaryOperatorAggregate<AgentContext, AgentContext>;
    iteration: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    fileAnalyses: import("@langchain/langgraph").BinaryOperatorAggregate<Map<string, FileAnalysis>, Map<string, FileAnalysis>>;
    currentSummary: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    currentRisks: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    currentComplexity: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    clarityScore: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    missingInformation: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    recommendations: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    insights: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    reasoning: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    totalInputTokens: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    totalOutputTokens: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
}>;
export interface PRAgentWorkflowConfig {
    maxIterations: number;
    clarityThreshold: number;
    skipSelfRefinement?: boolean;
}
export declare abstract class BasePRAgentWorkflow {
    protected model: ChatAnthropic;
    protected workflow: ReturnType<typeof this.buildWorkflow>;
    protected checkpointer: MemorySaver;
    protected tools: any[];
    constructor(apiKey: string, modelName?: string);
    private buildWorkflow;
    execute(context: AgentContext, options?: AgentExecutionOptions): Promise<AgentResult>;
    private executeFastPath;
    private analyzeFilesNode;
    private detectRisksNode;
    private calculateComplexityNode;
    private generateSummaryNode;
    private evaluateQualityNode;
    private refineAnalysisNode;
    private finalizeNode;
    private shouldRefine;
}
//# sourceMappingURL=base-pr-agent-workflow.d.ts.map