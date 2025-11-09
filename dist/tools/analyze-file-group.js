"use strict";
/**
 * Analyze file group tool - analyzes multiple files together
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalyzeFileGroupTool = createAnalyzeFileGroupTool;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const prompts_1 = require("../prompts");
const helpers_1 = require("./helpers");
function createAnalyzeFileGroupTool(context) {
    const { state, llm, provider, getFileContent, getDeletedFileContent } = context;
    return new tools_1.DynamicStructuredTool({
        name: 'analyze_file_group',
        description: 'Analyze a group of related files together. More efficient for related changes.',
        schema: zod_1.z.object({
            filePaths: zod_1.z.array(zod_1.z.string()).describe('Array of file paths to analyze together'),
        }),
        func: async ({ filePaths }) => {
            const alreadyAnalyzed = filePaths.filter(path => state.analyzedFiles.has(path));
            const files = state.pendingFiles.filter(f => filePaths.includes(f.path));
            if (files.length === 0) {
                if (alreadyAnalyzed.length > 0) {
                    return JSON.stringify({
                        message: `All ${filePaths.length} files already analyzed`,
                        alreadyAnalyzed: alreadyAnalyzed,
                        success: true
                    });
                }
                return JSON.stringify({
                    error: `No matching files found in pending list. Use get_current_state to see available files.`,
                    requestedFiles: filePaths,
                    suggestion: 'Call get_current_state to see which files need analysis'
                });
            }
            try {
                const mode = state.mode || { summary: true, risks: true, complexity: true };
                const results = [];
                for (const file of files) {
                    const { fileContent, analysisContext } = (0, helpers_1.prepareFileContent)(file, getFileContent, getDeletedFileContent);
                    const outputFormat = state.outputFormat || 'terminal';
                    const isTerminal = outputFormat === 'terminal';
                    const customPrompt = (0, prompts_1.buildFileAnalysisPrompt)(analysisContext, fileContent, `${file.path} (in group context)`, file.status || 'M', isTerminal, mode);
                    try {
                        const response = await llm.invoke(customPrompt);
                        const rawResponse = response.content;
                        const analysis = {
                            summary: rawResponse,
                            risks: [],
                            complexity: 3,
                            provider: provider.getProviderType(),
                            model: provider.config?.model || 'claude-sonnet-4-5-20250929',
                            tokensUsed: response.usage?.input_tokens ?
                                response.usage.input_tokens + (response.usage.output_tokens || 0) :
                                undefined
                        };
                        (0, helpers_1.extractRisksAndComplexity)(rawResponse, analysis, state);
                        state.analyzedFiles.set(file.path, analysis);
                        results.push({ file: file.path, analysis });
                    }
                    catch (error) {
                        results.push({ file: file.path, error: error.message });
                    }
                }
                state.pendingFiles = state.pendingFiles.filter(f => !filePaths.includes(f.path));
                return JSON.stringify({
                    success: true,
                    results,
                    filePaths,
                    analyzedCount: files.length,
                    remaining: state.pendingFiles.length,
                    message: `Successfully analyzed ${files.length} file(s). Remaining: ${state.pendingFiles.length} files`
                });
            }
            catch (error) {
                return JSON.stringify({
                    error: `Failed to analyze file group: ${error.message}`,
                    filePaths,
                    success: false
                });
            }
        },
    });
}
//# sourceMappingURL=analyze-file-group.js.map