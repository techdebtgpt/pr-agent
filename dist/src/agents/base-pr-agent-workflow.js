import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { ChatAnthropic } from '@langchain/anthropic';
import { parseDiff, createFileAnalyzerTool, createRiskDetectorTool, createComplexityScorerTool, createSummaryGeneratorTool, } from '../tools/pr-analysis-tools.js';
export const PRAgentState = Annotation.Root({
    context: Annotation({
        reducer: (_, update) => update,
    }),
    iteration: Annotation({
        reducer: (_, update) => update,
        default: () => 0,
    }),
    fileAnalyses: Annotation({
        reducer: (_, update) => update,
        default: () => new Map(),
    }),
    currentSummary: Annotation({
        reducer: (_, update) => update,
        default: () => '',
    }),
    currentRisks: Annotation({
        reducer: (_, update) => update,
        default: () => [],
    }),
    currentComplexity: Annotation({
        reducer: (_, update) => update,
        default: () => 1,
    }),
    clarityScore: Annotation({
        reducer: (_, update) => update,
        default: () => 0,
    }),
    missingInformation: Annotation({
        reducer: (_, update) => update,
        default: () => [],
    }),
    recommendations: Annotation({
        reducer: (_, update) => update,
        default: () => [],
    }),
    insights: Annotation({
        reducer: (current, update) => [...current, ...update],
        default: () => [],
    }),
    reasoning: Annotation({
        reducer: (current, update) => [...current, ...update],
        default: () => [],
    }),
    totalInputTokens: Annotation({
        reducer: (current, update) => current + update,
        default: () => 0,
    }),
    totalOutputTokens: Annotation({
        reducer: (current, update) => current + update,
        default: () => 0,
    }),
});
export class BasePRAgentWorkflow {
    model;
    workflow;
    checkpointer = new MemorySaver();
    tools;
    constructor(apiKey, modelName = 'claude-sonnet-4-5-20250929') {
        this.model = new ChatAnthropic({
            apiKey,
            modelName,
            temperature: 0.2,
            maxTokens: 2000,
        });
        this.tools = [
            createFileAnalyzerTool(),
            createRiskDetectorTool(),
            createComplexityScorerTool(),
            createSummaryGeneratorTool(),
        ];
        this.workflow = this.buildWorkflow();
    }
    buildWorkflow() {
        const graph = new StateGraph(PRAgentState);
        graph.addNode('analyzeFiles', this.analyzeFilesNode.bind(this));
        graph.addNode('detectRisks', this.detectRisksNode.bind(this));
        graph.addNode('calculateComplexity', this.calculateComplexityNode.bind(this));
        graph.addNode('generateSummary', this.generateSummaryNode.bind(this));
        graph.addNode('evaluateQuality', this.evaluateQualityNode.bind(this));
        graph.addNode('refineAnalysis', this.refineAnalysisNode.bind(this));
        graph.addNode('finalize', this.finalizeNode.bind(this));
        const entryPoint = 'analyzeFiles';
        graph.setEntryPoint(entryPoint);
        graph.addEdge(entryPoint, 'detectRisks');
        graph.addEdge('detectRisks', 'calculateComplexity');
        graph.addEdge('calculateComplexity', 'generateSummary');
        graph.addEdge('generateSummary', 'evaluateQuality');
        graph.addConditionalEdges('evaluateQuality', this.shouldRefine.bind(this), {
            refine: 'refineAnalysis',
            finalize: 'finalize',
        });
        graph.addEdge('refineAnalysis', 'evaluateQuality');
        graph.addEdge('finalize', END);
        return graph.compile({ checkpointer: this.checkpointer });
    }
    async execute(context, options) {
        const startTime = Date.now();
        if (options?.skipSelfRefinement) {
            return this.executeFastPath(context, startTime);
        }
        const config = {
            maxIterations: 3,
            clarityThreshold: 80,
            skipSelfRefinement: false,
        };
        const initialState = {
            context,
            iteration: 0,
            fileAnalyses: new Map(),
            currentSummary: '',
            currentRisks: [],
            currentComplexity: 1,
            clarityScore: 0,
            missingInformation: [],
            recommendations: [],
            insights: [],
            reasoning: [],
            totalInputTokens: 0,
            totalOutputTokens: 0,
        };
        const workflowConfig = {
            configurable: {
                thread_id: `pr-agent-${Date.now()}`,
                maxIterations: config.maxIterations,
                clarityThreshold: config.clarityThreshold,
            },
            recursionLimit: 50,
        };
        let finalState = initialState;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        try {
            for await (const state of await this.workflow.stream(initialState, workflowConfig)) {
                const nodeNames = Object.keys(state);
                if (nodeNames.length > 0) {
                    const lastNodeName = nodeNames[nodeNames.length - 1];
                    finalState = state[lastNodeName] || finalState;
                    const stateAny = finalState;
                    if (stateAny.totalInputTokens !== undefined) {
                        totalInputTokens = stateAny.totalInputTokens;
                    }
                    if (stateAny.totalOutputTokens !== undefined) {
                        totalOutputTokens = stateAny.totalOutputTokens;
                    }
                }
            }
        }
        catch (error) {
            console.error('Workflow execution error:', error);
            throw error;
        }
        const executionTime = Date.now() - startTime;
        return {
            summary: finalState.currentSummary,
            fileAnalyses: finalState.fileAnalyses,
            overallComplexity: finalState.currentComplexity,
            overallRisks: finalState.currentRisks,
            recommendations: finalState.recommendations,
            insights: finalState.insights,
            reasoning: finalState.reasoning,
            provider: 'anthropic',
            model: this.model.modelName,
            totalTokensUsed: totalInputTokens + totalOutputTokens,
            executionTime,
            mode: context.mode,
        };
    }
    async executeFastPath(context, startTime) {
        const files = parseDiff(context.diff);
        const fileAnalyses = new Map();
        for (const file of files.slice(0, 20)) {
            const analysis = {
                path: file.path,
                summary: `Modified ${file.additions} lines, deleted ${file.deletions} lines`,
                risks: [],
                complexity: Math.min(5, Math.floor((file.additions + file.deletions) / 50) + 1),
                changes: {
                    additions: file.additions,
                    deletions: file.deletions,
                },
                recommendations: [],
            };
            fileAnalyses.set(file.path, analysis);
        }
        const complexities = Array.from(fileAnalyses.values()).map(f => f.complexity);
        const overallComplexity = complexities.length > 0
            ? Math.round(complexities.reduce((a, b) => a + b, 0) / complexities.length)
            : 1;
        const executionTime = Date.now() - startTime;
        return {
            summary: `Analyzed ${files.length} files with ${files.reduce((sum, f) => sum + f.additions, 0)} additions and ${files.reduce((sum, f) => sum + f.deletions, 0)} deletions`,
            fileAnalyses,
            overallComplexity,
            overallRisks: [],
            recommendations: ['Fast path analysis - run with --agent for detailed analysis'],
            insights: [],
            reasoning: ['Fast path: Self-refinement skipped for speed'],
            provider: 'anthropic',
            model: this.model.modelName,
            totalTokensUsed: 0,
            executionTime,
            mode: context.mode,
        };
    }
    async analyzeFilesNode(state) {
        const { context } = state;
        const files = parseDiff(context.diff);
        console.log(`🔍 Analyzing ${files.length} files...`);
        const fileAnalyses = new Map();
        for (const file of files.slice(0, 20)) {
            const analysis = {
                path: file.path,
                summary: `${file.status || 'M'}: +${file.additions} -${file.deletions}`,
                risks: [],
                complexity: Math.min(5, Math.floor((file.additions + file.deletions) / 50) + 1),
                changes: {
                    additions: file.additions,
                    deletions: file.deletions,
                },
                recommendations: [],
            };
            fileAnalyses.set(file.path, analysis);
        }
        return {
            ...state,
            fileAnalyses,
            insights: [`Analyzed ${files.length} files`],
        };
    }
    async detectRisksNode(state) {
        const { context, fileAnalyses } = state;
        console.log('⚠️  Detecting risks...');
        const risks = [];
        if (context.diff.includes('password') || context.diff.includes('secret')) {
            risks.push('Potential credentials in diff');
        }
        if (fileAnalyses.size > 15) {
            risks.push('Large change set - difficult to review');
        }
        return {
            ...state,
            currentRisks: risks,
            insights: [`Identified ${risks.length} potential risks`],
        };
    }
    async calculateComplexityNode(state) {
        const { fileAnalyses } = state;
        console.log('📊 Calculating complexity...');
        const complexities = Array.from(fileAnalyses.values()).map(f => f.complexity);
        const avgComplexity = complexities.length > 0
            ? complexities.reduce((a, b) => a + b, 0) / complexities.length
            : 1;
        return {
            ...state,
            currentComplexity: Math.round(avgComplexity),
        };
    }
    async generateSummaryNode(state) {
        const { context, fileAnalyses, currentRisks, currentComplexity } = state;
        console.log('📝 Generating summary...');
        const totalFiles = fileAnalyses.size;
        const totalAdditions = Array.from(fileAnalyses.values()).reduce((sum, f) => sum + f.changes.additions, 0);
        const totalDeletions = Array.from(fileAnalyses.values()).reduce((sum, f) => sum + f.changes.deletions, 0);
        const summary = `PR Analysis Summary:
- Files changed: ${totalFiles}
- Additions: ${totalAdditions}
- Deletions: ${totalDeletions}
- Overall complexity: ${currentComplexity}/5
- Risks identified: ${currentRisks.length}

${context.title ? `Title: ${context.title}` : ''}`;
        return {
            ...state,
            currentSummary: summary,
        };
    }
    async evaluateQualityNode(state) {
        const { iteration } = state;
        console.log(`🔍 Evaluating quality (iteration ${iteration + 1})...`);
        const clarityScore = 85;
        return {
            ...state,
            clarityScore,
            iteration: iteration + 1,
        };
    }
    async refineAnalysisNode(state) {
        console.log('🔄 Refining analysis...');
        return {
            ...state,
            recommendations: ['Consider breaking into smaller PRs', 'Add more test coverage'],
        };
    }
    async finalizeNode(state) {
        console.log('✨ Finalizing analysis...');
        return state;
    }
    shouldRefine(state) {
        const maxIterations = 3;
        const clarityThreshold = 80;
        if (state.iteration >= maxIterations) {
            console.log(`⏹️  Stopping: Max iterations (${maxIterations}) reached`);
            return 'finalize';
        }
        if (state.clarityScore >= clarityThreshold) {
            console.log(`✅ Stopping: Clarity threshold (${clarityThreshold}) achieved`);
            return 'finalize';
        }
        console.log(`🔄 Continuing: Iteration ${state.iteration}, clarity ${state.clarityScore}`);
        return 'refine';
    }
}
//# sourceMappingURL=base-pr-agent-workflow.js.map