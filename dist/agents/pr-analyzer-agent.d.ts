/**
 * PR Analyzer Agent
 * LangChain-based agent for intelligent PR analysis
 */
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BasePRAgentWorkflow } from './base-pr-agent-workflow.js';
import { AgentContext, AgentResultOrPrompts, AgentMetadata, AnalysisMode, ExecutionMode } from '../types/agent.types.js';
import { ProviderOptions } from '../providers/index.js';
/**
 * Extended options that allow passing a pre-configured model
 * Used by MCP server to pass its underlying LLM model
 */
export interface PRAnalyzerOptions extends ProviderOptions {
    /** Execution mode: EXECUTE (with API key) or PROMPT_ONLY (return prompts) */
    mode?: ExecutionMode;
    /** Pre-configured LangChain model (for MCP server pass-through) */
    chatModel?: BaseChatModel;
}
/**
 * PR Analysis Agent using LangChain and LangGraph
 */
export declare class PRAnalyzerAgent extends BasePRAgentWorkflow {
    constructor(options?: PRAnalyzerOptions);
    /**
     * Get agent metadata
     */
    getMetadata(): AgentMetadata;
    /**
     * Analyze a PR with full agent workflow
     * Returns either executed results (EXECUTE mode) or prompts (PROMPT_ONLY mode)
     */
    analyze(diff: string, title?: string, mode?: AnalysisMode, options?: {
        useArchDocs?: boolean;
        repoPath?: string;
        repoOwner?: string;
        repoName?: string;
        language?: string;
        framework?: string;
        enableStaticAnalysis?: boolean;
    }): Promise<AgentResultOrPrompts>;
    /**
     * Quick analysis without refinement
     */
    quickAnalyze(diff: string, title?: string, options?: {
        useArchDocs?: boolean;
        repoPath?: string;
        language?: string;
        framework?: string;
        enableStaticAnalysis?: boolean;
    }): Promise<AgentResultOrPrompts>;
    /**
     * Analyze specific files only
     */
    analyzeFiles(diff: string, filePaths: string[], options?: {
        useArchDocs?: boolean;
        repoPath?: string;
    }): Promise<AgentResultOrPrompts>;
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
export declare function createPRAnalyzerAgent(options?: PRAnalyzerOptions): PRAnalyzerAgent;
/**
 * Legacy factory function for backward compatibility
 * @deprecated Use PRAnalyzerAgent constructor with ProviderOptions instead
 */
export declare function createPRAnalyzerAgentLegacy(apiKey: string, modelName?: string): PRAnalyzerAgent;
