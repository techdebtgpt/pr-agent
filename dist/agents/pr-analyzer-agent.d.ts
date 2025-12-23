/**
 * PR Analyzer Agent
 * LangChain-based agent for intelligent PR analysis
 */
import { BasePRAgentWorkflow } from './base-pr-agent-workflow.js';
import { AgentContext, AgentResult, AgentMetadata, AnalysisMode } from '../types/agent.types.js';
import { ProviderOptions } from '../providers/index.js';
/**
 * PR Analysis Agent using LangChain and LangGraph
 */
export declare class PRAnalyzerAgent extends BasePRAgentWorkflow {
    constructor(options?: ProviderOptions);
    /**
     * Get agent metadata
     */
    getMetadata(): AgentMetadata;
    /**
     * Analyze a PR with full agent workflow
     */
    analyze(diff: string, title?: string, mode?: AnalysisMode, options?: {
        useArchDocs?: boolean;
        repoPath?: string;
        language?: string;
        framework?: string;
        enableStaticAnalysis?: boolean;
    }): Promise<AgentResult>;
    /**
     * Quick analysis without refinement
     */
    quickAnalyze(diff: string, title?: string, options?: {
        useArchDocs?: boolean;
        repoPath?: string;
        language?: string;
        framework?: string;
        enableStaticAnalysis?: boolean;
    }): Promise<AgentResult>;
    /**
     * Analyze specific files only
     */
    analyzeFiles(diff: string, filePaths: string[], options?: {
        useArchDocs?: boolean;
        repoPath?: string;
    }): Promise<AgentResult>;
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
export declare function createPRAnalyzerAgent(options?: ProviderOptions): PRAnalyzerAgent;
/**
 * Legacy factory function for backward compatibility
 * @deprecated Use PRAnalyzerAgent constructor with ProviderOptions instead
 */
export declare function createPRAnalyzerAgentLegacy(apiKey: string, modelName?: string): PRAnalyzerAgent;
