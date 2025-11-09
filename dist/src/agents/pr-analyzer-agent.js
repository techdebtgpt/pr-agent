import { BasePRAgentWorkflow } from './base-pr-agent-workflow.js';
import { parseDiff } from '../tools/pr-analysis-tools.js';
export class PRAnalyzerAgent extends BasePRAgentWorkflow {
    constructor(apiKey, modelName = 'claude-sonnet-4-5-20250929') {
        super(apiKey, modelName);
    }
    getMetadata() {
        return {
            name: 'pr-analyzer',
            version: '2.0.0',
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
    async analyze(diff, title, mode) {
        const files = parseDiff(diff);
        const context = {
            diff,
            title,
            files,
            tokenBudget: 100000,
            maxCost: 5.0,
            mode: mode || { summary: true, risks: true, complexity: true },
        };
        const result = await this.execute(context, {
            skipSelfRefinement: files.length < 5 || diff.length < 10000,
        });
        return result;
    }
    async quickAnalyze(diff, title) {
        const files = parseDiff(diff);
        const context = {
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
    async analyzeFiles(diff, filePaths) {
        const allFiles = parseDiff(diff);
        const files = allFiles.filter(f => filePaths.includes(f.path));
        const context = {
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
    async canExecute(context) {
        return context.files.length > 0 && context.diff.length > 0;
    }
    async estimateTokens(context) {
        const baseTokens = 2000;
        const diffTokens = Math.ceil(context.diff.length / 4);
        const filesTokens = context.files.length * 100;
        return baseTokens + diffTokens + filesTokens;
    }
}
export function createPRAnalyzerAgent(apiKey, modelName) {
    return new PRAnalyzerAgent(apiKey, modelName);
}
//# sourceMappingURL=pr-analyzer-agent.js.map