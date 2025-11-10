"use strict";
/**
 * LangChain Tools for PR Analysis Agent
 * Main entry point - assembles all tools from separate modules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLangChainTools = createLangChainTools;
const analyze_file_group_1 = require("./tools/analyze-file-group");
const check_imports_1 = require("./tools/check-imports");
const synthesize_1 = require("./tools/synthesize");
const state_tools_1 = require("./tools/state-tools");
/**
 * Create all LangChain tools for the PR analysis agent
 */
function createLangChainTools(context) {
    const tools = [];
    // Add individual tools
    tools.push(createAnalyzeFileTool(context));
    tools.push((0, analyze_file_group_1.createAnalyzeFileGroupTool)(context));
    const checkImportsTool = (0, check_imports_1.createCheckImportsTool)(context);
    if (checkImportsTool) {
        tools.push(checkImportsTool);
    }
    tools.push((0, synthesize_1.createSynthesizeTool)(context));
    // Add state tools
    tools.push(...(0, state_tools_1.createStateTools)(context));
    return tools;
}
//# sourceMappingURL=pr-agent-tools.js.map