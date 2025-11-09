/**
 * PR Analyzer Agent
 * LangChain-based agent for intelligent PR analysis
 */
import { BasePRAgentWorkflow } from './base-pr-agent-workflow.js';
import { AgentContext, AgentResult, AgentMetadata, AnalysisMode } from '../types/agent.types.js';
/**
 * PR Analysis Agent using LangChain and LangGraph
 */
export declare class PRAnalyzerAgent extends BasePRAgentWorkflow {
    constructor(apiKey: string, modelName?: string);
    /**
     * Get agent metadata
     */
    getMetadata(): AgentMetadata;
    /**
     * Analyze a PR with full agent workflow
     */
    analyze(diff: string, title?: string, mode?: AnalysisMode): Promise<AgentResult>;
    /**
     * Quick analysis without refinement
     */
    quickAnalyze(diff: string, title?: string): Promise<AgentResult>;
    /**
     * Analyze specific files only
     */
    analyzeFiles(diff: string, filePaths: string[]): Promise<AgentResult>;
    /**
     * Check if agent can execute with given context
     */
    canExecute(context: AgentContext): Promise<boolean>;
    /**
     * Estimate tokens for this analysis
     */
    estimateTokens(context: AgentContext): Promise<number>;
}
/**
 * Factory function to create PR analyzer agent
 */
export declare function createPRAnalyzerAgent(apiKey: string, modelName?: string): PRAnalyzerAgent;
