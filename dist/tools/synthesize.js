"use strict";
/**
 * Synthesize findings tool - synthesizes all analyzed files
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSynthesizeTool = createSynthesizeTool;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const prompts_1 = require("../prompts");
function createSynthesizeTool(context) {
    const { state, provider } = context;
    return new tools_1.DynamicStructuredTool({
        name: 'synthesize_findings',
        description: 'Synthesize all analyzed files into overall insights. CRITICAL: Only call this when ALL files have been analyzed (get_current_state shows pendingCount = 0). Do not call this until every file is done.',
        schema: zod_1.z.object({}),
        func: async () => {
            if (state.pendingFiles.length > 0) {
                const remaining = state.pendingFiles.map(f => f.path).join(', ');
                return JSON.stringify({
                    error: `Cannot synthesize: ${state.pendingFiles.length} files still pending`,
                    pendingFiles: remaining,
                    message: `Please analyze these files first: ${remaining}`
                });
            }
            if (state.analyzedFiles.size === 0) {
                return JSON.stringify({
                    error: 'Cannot synthesize: No files have been analyzed yet',
                    message: 'Please analyze at least one file before synthesizing'
                });
            }
            const fileSummaries = Array.from(state.analyzedFiles.entries())
                .map(([path, analysis]) => `File: ${path}\n  Summary: ${analysis.summary}\n  Risks: ${analysis.risks.join(', ')}\n  Complexity: ${analysis.complexity}/5`)
                .join('\n\n');
            const synthesisContent = fileSummaries || 'No file summaries available';
            const outputFormat = state.outputFormat || 'terminal';
            const isTerminal = outputFormat === 'terminal';
            const synthesisPrompt = (0, prompts_1.buildSynthesisPrompt)(synthesisContent, state.context, state.analyzedFiles.size, isTerminal);
            try {
                const request = {
                    diff: synthesisContent,
                    title: 'Synthesizing PR analysis',
                    outputFormat: outputFormat
                };
                const synthesis = await provider.analyze(request);
                state.insights.push(synthesis.summary);
                if (synthesis.recommendations) {
                    state.insights.push(...synthesis.recommendations);
                }
                state.lastSynthesis = synthesis;
                return JSON.stringify({
                    success: true,
                    ...synthesis,
                    message: 'Synthesis completed successfully'
                });
            }
            catch (error) {
                const allRisks = Array.from(state.risks);
                const avgComplexity = state.analyzedFiles.size > 0
                    ? Math.round(Array.from(state.analyzedFiles.values())
                        .reduce((sum, a) => sum + a.complexity, 0) / state.analyzedFiles.size)
                    : 3;
                const fallbackSynthesis = {
                    summary: `Analyzed ${state.analyzedFiles.size} file(s). ${allRisks.length > 0 ? `Found ${allRisks.length} risk(s).` : 'No major risks identified.'}`,
                    risks: allRisks,
                    complexity: avgComplexity,
                    recommendations: state.insights.length > 0 ? state.insights.slice(0, 5) : [],
                    provider: provider.getProviderType(),
                    model: provider.config?.model || 'claude-sonnet-4-5-20250929'
                };
                state.lastSynthesis = fallbackSynthesis;
                return JSON.stringify({
                    success: true,
                    ...fallbackSynthesis,
                    message: 'Synthesis completed (fallback)'
                });
            }
        },
    });
}
//# sourceMappingURL=synthesize.js.map