/**
 * PR Analyzer Agent
 * LangChain-based agent for intelligent PR analysis
 */

import { BasePRAgentWorkflow } from './base-pr-agent-workflow.js';
import { AgentContext, AgentResult, AgentMetadata, AnalysisMode } from '../types/agent.types.js';
import { parseDiff } from '../tools/pr-analysis-tools.js';

/**
 * PR Analysis Agent using LangChain and LangGraph
 */
export class PRAnalyzerAgent extends BasePRAgentWorkflow {
  constructor(apiKey: string, modelName: string = 'claude-sonnet-4-5-20250929') {
    super(apiKey, modelName);
  }

  /**
   * Get agent metadata
   */
  getMetadata(): AgentMetadata {
    return {
      name: 'pr-analyzer',
      version: '1.0.0',
      description: 'AI-powered pull request analyzer using LangChain agent workflow',
      capabilities: [
        'file-level analysis',
        'risk detection',
        'complexity scoring',
        'intelligent recommendations',
        'self-refinement workflow',
      ],
    };
  }

  /**
   * Analyze a PR with full agent workflow
   */
  async analyze(
    diff: string,
    title?: string,
    mode?: AnalysisMode,
  ): Promise<AgentResult> {
    // Parse diff into files
    const files = parseDiff(diff);

    // Create context
    const context: AgentContext = {
      diff,
      title,
      files,
      tokenBudget: 100000,
      maxCost: 5.0,
      mode: mode || { summary: true, risks: true, complexity: true },
    };

    // Execute workflow
    const result = await this.execute(context, {
      skipSelfRefinement: files.length < 5 || diff.length < 10000, // Skip for small PRs
    });

    return result;
  }

  /**
   * Quick analysis without refinement
   */
  async quickAnalyze(diff: string, title?: string): Promise<AgentResult> {
    const files = parseDiff(diff);

    const context: AgentContext = {
      diff,
      title,
      files,
      tokenBudget: 50000,
      maxCost: 2.0,
      mode: { summary: true, risks: true, complexity: true },
    };

    return this.execute(context, {
      skipSelfRefinement: true,
    });
  }

  /**
   * Analyze specific files only
   */
  async analyzeFiles(diff: string, filePaths: string[]): Promise<AgentResult> {
    const allFiles = parseDiff(diff);
    const files = allFiles.filter(f => filePaths.includes(f.path));

    const context: AgentContext = {
      diff,
      files,
      tokenBudget: 50000,
      maxCost: 2.0,
      mode: { summary: true, risks: true, complexity: true },
    };

    return this.execute(context, {
      skipSelfRefinement: true,
    });
  }

  /**
   * Check if agent can execute with given context
   */
  async canExecute(context: AgentContext): Promise<boolean> {
    return context.files.length > 0 && context.diff.length > 0;
  }

  /**
   * Estimate tokens for this analysis
   */
  async estimateTokens(context: AgentContext): Promise<number> {
    const baseTokens = 2000;
    const diffTokens = Math.ceil(context.diff.length / 4); // ~4 chars per token
    const filesTokens = context.files.length * 100;
    
    return baseTokens + diffTokens + filesTokens;
  }
}

/**
 * Factory function to create PR analyzer agent
 */
export function createPRAnalyzerAgent(apiKey: string, modelName?: string): PRAnalyzerAgent {
  return new PRAnalyzerAgent(apiKey, modelName);
}

