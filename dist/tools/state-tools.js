"use strict";
/**
 * State tools - get current state and remaining files
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStateTools = createStateTools;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
function createStateTools(context) {
    const { state } = context;
    const tools = [];
    tools.push(new tools_1.DynamicStructuredTool({
        name: 'get_current_state',
        description: 'Get the current analysis state: which files have been analyzed, which are pending, and current risks. Call this frequently to track progress. Shows exactly what still needs to be analyzed.',
        schema: zod_1.z.object({}),
        func: async () => {
            const analyzedPaths = Array.from(state.analyzedFiles.keys());
            const pendingPaths = state.pendingFiles.map(f => ({
                path: f.path,
                status: f.status || 'M',
                additions: f.additions,
                deletions: f.deletions,
                totalChanges: f.additions + f.deletions
            }));
            const totalFiles = analyzedPaths.length + pendingPaths.length;
            const progressPercent = totalFiles > 0 ? ((analyzedPaths.length / totalFiles) * 100).toFixed(1) : '0';
            return JSON.stringify({
                analyzed: analyzedPaths,
                analyzedCount: analyzedPaths.length,
                pending: pendingPaths,
                pendingCount: pendingPaths.length,
                totalFiles: totalFiles,
                progressPercent: `${progressPercent}%`,
                risksCount: state.risks.size,
                insightsCount: state.insights.length,
                message: pendingPaths.length === 0
                    ? '✅ ALL FILES ANALYZED - Ready to synthesize'
                    : `⚠️ ${pendingPaths.length} files still need analysis: ${pendingPaths.map(p => p.path).join(', ')}`
            });
        },
    }));
    tools.push(new tools_1.DynamicStructuredTool({
        name: 'get_remaining_files',
        description: 'Get a detailed list of all files that still need to be analyzed. Returns file paths with their status and change counts.',
        schema: zod_1.z.object({}),
        func: async () => {
            const remaining = state.pendingFiles.map(f => ({
                path: f.path,
                status: f.status || 'M',
                additions: f.additions,
                deletions: f.deletions,
                totalChanges: f.additions + f.deletions,
                priority: f.status === 'A' ? 'HIGH' : f.status === 'D' ? 'HIGH' : (f.additions + f.deletions) > 100 ? 'MEDIUM' : 'LOW'
            }));
            return JSON.stringify({
                remainingFiles: remaining,
                count: remaining.length,
                highPriority: remaining.filter(f => f.priority === 'HIGH').length,
                mediumPriority: remaining.filter(f => f.priority === 'MEDIUM').length,
                lowPriority: remaining.filter(f => f.priority === 'LOW').length
            });
        },
    }));
    return tools;
}
//# sourceMappingURL=state-tools.js.map