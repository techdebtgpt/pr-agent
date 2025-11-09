"use strict";
/**
 * Check imports tool - checks imports and usages
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckImportsTool = createCheckImportsTool;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const import_checker_1 = require("./import-checker");
function createCheckImportsTool(context) {
    const { state, githubApi, repository } = context;
    if (!githubApi || !repository) {
        return null;
    }
    return new tools_1.DynamicStructuredTool({
        name: 'check_imports_and_usages',
        description: 'Check if imported modules/functions exist in the repository and verify their usage. Uses GitHub API.',
        schema: zod_1.z.object({
            filePath: zod_1.z.string().describe('Path to the file to check imports for'),
        }),
        func: async ({ filePath }) => {
            const file = state.pendingFiles.find(f => f.path === filePath) ||
                Array.from(state.analyzedFiles.keys()).find(k => k === filePath);
            if (!file) {
                const analyzedFile = state.analyzedFiles.get(filePath);
                if (analyzedFile) {
                    return JSON.stringify({ message: 'File already analyzed, imports checked during analysis' });
                }
                return JSON.stringify({ error: `File ${filePath} not found` });
            }
            const fileObj = typeof file === 'string' ? state.pendingFiles.find(f => f.path === file) : file;
            if (fileObj) {
                const result = await (0, import_checker_1.checkImportsAndUsages)(fileObj, githubApi, repository);
                return JSON.stringify(result);
            }
            return JSON.stringify({ error: 'File not found' });
        },
    });
}
//# sourceMappingURL=check-imports.js.map