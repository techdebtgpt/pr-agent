/**
 * PR Analyzer Agent
 * LangChain-based agent for intelligent PR analysis
 */
import { BasePRAgentWorkflow } from './base-pr-agent-workflow.js';
import { parseDiff } from '../tools/pr-analysis-tools.js';
import { ProviderFactory } from '../providers/index.js';
import { parseAllArchDocs, archDocsExists } from '../utils/arch-docs-parser.js';
import { buildArchDocsContext } from '../utils/arch-docs-rag.js';
/**
 * PR Analysis Agent using LangChain and LangGraph
 */
export class PRAnalyzerAgent extends BasePRAgentWorkflow {
    constructor(options = {}) {
        const model = ProviderFactory.createChatModel({
            provider: options.provider || 'anthropic',
            apiKey: options.apiKey,
            model: options.model,
            temperature: options.temperature ?? 0.2,
            maxTokens: options.maxTokens ?? 4000,
        });
        super(model);
    }
    /**
     * Get agent metadata
     */
    getMetadata() {
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
    async analyze(diff, title, mode, options) {
        // Parse diff into files
        const files = parseDiff(diff);
        // Build arch-docs context if enabled
        let archDocsContext = undefined;
        if (options?.useArchDocs !== false && archDocsExists(options?.repoPath)) {
            const docs = parseAllArchDocs(options?.repoPath);
            archDocsContext = buildArchDocsContext(docs, { title, files, diff });
        }
        // Create context
        const context = {
            diff,
            title,
            files,
            tokenBudget: 100000,
            maxCost: 5.0,
            mode: mode || { summary: true, risks: true, complexity: true },
            archDocs: archDocsContext,
            language: options?.language,
            framework: options?.framework,
            enableStaticAnalysis: options?.enableStaticAnalysis !== false, // Default to true
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
    async quickAnalyze(diff, title, options) {
        const files = parseDiff(diff);
        // Build arch-docs context if enabled
        let archDocsContext = undefined;
        if (options?.useArchDocs !== false && archDocsExists(options?.repoPath)) {
            const docs = parseAllArchDocs(options?.repoPath);
            archDocsContext = buildArchDocsContext(docs, { title, files, diff });
        }
        const context = {
            diff,
            title,
            files,
            tokenBudget: 50000,
            maxCost: 2.0,
            mode: { summary: true, risks: true, complexity: true },
            archDocs: archDocsContext,
            language: options?.language,
            framework: options?.framework,
            enableStaticAnalysis: options?.enableStaticAnalysis !== false,
        };
        return this.execute(context, {
            skipSelfRefinement: true,
        });
    }
    /**
     * Analyze specific files only
     */
    async analyzeFiles(diff, filePaths, options) {
        const allFiles = parseDiff(diff);
        const files = allFiles.filter(f => filePaths.includes(f.path));
        // Build arch-docs context if enabled
        let archDocsContext = undefined;
        if (options?.useArchDocs !== false && archDocsExists(options?.repoPath)) {
            const docs = parseAllArchDocs(options?.repoPath);
            archDocsContext = buildArchDocsContext(docs, { files, diff });
        }
        const context = {
            diff,
            files,
            tokenBudget: 50000,
            maxCost: 2.0,
            mode: { summary: true, risks: true, complexity: true },
            archDocs: archDocsContext,
        };
        return this.execute(context, {
            skipSelfRefinement: true,
        });
    }
    /**
     * Check if agent can execute with given context
     */
    async canExecute(context) {
        return context.files.length > 0 && context.diff.length > 0;
    }
    /**
     * Estimate tokens for this analysis
     */
    async estimateTokens(context) {
        const baseTokens = 2000;
        const diffTokens = Math.ceil(context.diff.length / 4); // ~4 chars per token
        const filesTokens = context.files.length * 100;
        return baseTokens + diffTokens + filesTokens;
    }
}
/**
 * Factory function to create PR analyzer agent
 */
export function createPRAnalyzerAgent(options = {}) {
    return new PRAnalyzerAgent(options);
}
/**
 * Legacy factory function for backward compatibility
 * @deprecated Use PRAnalyzerAgent constructor with ProviderOptions instead
 */
export function createPRAnalyzerAgentLegacy(apiKey, modelName) {
    return new PRAnalyzerAgent({
        apiKey,
        model: modelName,
        provider: 'anthropic'
    });
}
//# sourceMappingURL=pr-analyzer-agent.js.map