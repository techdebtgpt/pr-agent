import { BasePRAgentWorkflow } from './base-pr-agent-workflow.js';
import { AgentContext, AgentResult, AgentMetadata, AnalysisMode } from '../types/agent.types.js';
export declare class PRAnalyzerAgent extends BasePRAgentWorkflow {
    constructor(apiKey: string, modelName?: string);
    getMetadata(): AgentMetadata;
    analyze(diff: string, title?: string, mode?: AnalysisMode): Promise<AgentResult>;
    quickAnalyze(diff: string, title?: string): Promise<AgentResult>;
    analyzeFiles(diff: string, filePaths: string[]): Promise<AgentResult>;
    canExecute(context: AgentContext): Promise<boolean>;
    estimateTokens(context: AgentContext): Promise<number>;
}
export declare function createPRAnalyzerAgent(apiKey: string, modelName?: string): PRAnalyzerAgent;
//# sourceMappingURL=pr-analyzer-agent.d.ts.map