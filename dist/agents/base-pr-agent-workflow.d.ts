/**
 * Base PR Agent Workflow using LangGraph
 * Follows architecture-doc-generator patterns with self-refinement
 */
import { MemorySaver } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AgentContext, AgentResult, FileAnalysis, AgentExecutionOptions } from '../types/agent.types.js';
/**
 * Agent workflow state
 */
export declare const PRAgentState: import("@langchain/langgraph").AnnotationRoot<{
    context: import("@langchain/langgraph").BinaryOperatorAggregate<AgentContext, AgentContext>;
    iteration: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    fileAnalyses: import("@langchain/langgraph").BinaryOperatorAggregate<Map<string, FileAnalysis>, Map<string, FileAnalysis>>;
    currentSummary: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    currentRisks: import("@langchain/langgraph").BinaryOperatorAggregate<any[], any[]>;
    currentComplexity: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    clarityScore: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    missingInformation: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    recommendations: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    insights: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    reasoning: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    archDocsInfluencedStages: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    archDocsKeyInsights: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    totalInputTokens: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    totalOutputTokens: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
}>;
/**
 * Configuration for PR agent workflow
 */
export interface PRAgentWorkflowConfig {
    maxIterations: number;
    clarityThreshold: number;
    skipSelfRefinement?: boolean;
}
/**
 * Base class for PR agents with self-refinement workflow
 */
export declare abstract class BasePRAgentWorkflow {
    protected model: BaseChatModel;
    protected workflow: ReturnType<typeof this.buildWorkflow>;
    protected checkpointer: MemorySaver;
    protected tools: any[];
    constructor(model: BaseChatModel);
    /**
     * Build the PR analysis workflow
     */
    private buildWorkflow;
    /**
     * Execute the agent workflow
     */
    execute(context: AgentContext, options?: AgentExecutionOptions): Promise<AgentResult>;
    /**
     * Fast path execution - skip refinement loop but still use LLM for detailed analysis
     */
    private executeFastPath;
    /**
     * Smart change detection - analyzes files and returns only relevant enhanced features
     */
    private detectAndAnalyzeChangeTypes;
    private analyzeFilesNode;
    private detectRisksNode;
    private calculateComplexityNode;
    private generateSummaryNode;
    private evaluateQualityNode;
    private refineAnalysisNode;
    private finalizeNode;
    private shouldRefine;
}
