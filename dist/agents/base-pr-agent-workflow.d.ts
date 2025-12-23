/**
 * Base PR Agent Workflow using LangGraph
 * Follows architecture-doc-generator patterns with self-refinement
 */
import { MemorySaver } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AgentContext, AgentResult, FileAnalysis, AgentExecutionOptions } from '../types/agent.types.js';
import { SemgrepResult, SemgrepSummary } from '../types/semgrep.types.js';
/**
 * Agent workflow state
 */
export declare const PRAgentState: import("@langchain/langgraph").AnnotationRoot<{
    context: import("@langchain/langgraph").BinaryOperatorAggregate<AgentContext, AgentContext>;
    iteration: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    fileAnalyses: import("@langchain/langgraph").BinaryOperatorAggregate<Map<string, FileAnalysis>, Map<string, FileAnalysis>>;
    currentSummary: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    fixes: import("@langchain/langgraph").BinaryOperatorAggregate<{
        file: string;
        line?: number;
        comment: string;
        severity?: "critical" | "warning" | "suggestion";
    }[], {
        file: string;
        line?: number;
        comment: string;
        severity?: "critical" | "warning" | "suggestion";
    }[]>;
    clarityScore: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    missingInformation: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    recommendations: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    insights: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    reasoning: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    archDocsInfluencedStages: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    archDocsKeyInsights: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    totalInputTokens: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    totalOutputTokens: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    semgrepResult: import("@langchain/langgraph").BinaryOperatorAggregate<SemgrepResult | null, SemgrepResult | null>;
    semgrepSummary: import("@langchain/langgraph").BinaryOperatorAggregate<SemgrepSummary | null, SemgrepSummary | null>;
}>;
/**
 * Configuration for PR agent workflow
 */
export interface PRAgentWorkflowConfig {
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
    private analyzeFilesNode;
    private runStaticAnalysisNode;
    private generateFixesNode;
    private generateSummaryNode;
    private finalizeNode;
}
