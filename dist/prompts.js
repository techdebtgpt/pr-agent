"use strict";
/**
 * Prompt loader - loads prompt templates from files at runtime
 * This avoids large string literals in TypeScript code, reducing compilation memory usage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFileAnalysisPrompt = buildFileAnalysisPrompt;
exports.buildSynthesisPrompt = buildSynthesisPrompt;
const fs_1 = require("fs");
const path_1 = require("path");
// Resolve prompts directory
// In compiled code: __dirname points to dist/, so prompts/ is at ../prompts
// Fallback: try relative to current working directory
const PROMPTS_DIR = (() => {
    try {
        // @ts-ignore - __dirname is available in CommonJS runtime
        if (typeof __dirname !== 'undefined') {
            return (0, path_1.join)(__dirname, '..', 'prompts');
        }
    }
    catch (e) {
        // Fallback
    }
    // Fallback: relative to current working directory (for dev/testing)
    return (0, path_1.join)(process.cwd(), 'prompts');
})();
// Cache for loaded prompts
const promptCache = new Map();
function loadPrompt(filename) {
    if (promptCache.has(filename)) {
        return promptCache.get(filename);
    }
    try {
        const content = (0, fs_1.readFileSync)((0, path_1.join)(PROMPTS_DIR, filename), 'utf-8');
        promptCache.set(filename, content);
        return content;
    }
    catch (error) {
        throw new Error(`Failed to load prompt file ${filename}: ${error.message}`);
    }
}
function replacePlaceholders(template, replacements) {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
}
function buildFileAnalysisPrompt(analysisContext, fileContent, filePath, fileStatus, isTerminal, mode) {
    const statusLabel = fileStatus === 'A' ? ' (NEW FILE)' : fileStatus === 'D' ? ' (DELETED)' : '';
    const contentLabel = fileStatus === 'A'
        ? 'The following is the COMPLETE NEW FILE being added:'
        : fileStatus === 'D'
            ? 'The following shows the DELETED FILE and its removal:'
            : 'The following is the diff of the PR that needs reviewing:';
    const formatSection = loadPrompt(isTerminal ? 'format-terminal.txt' : 'format-markdown.txt');
    const importantSection = loadPrompt(isTerminal ? 'important-terminal.txt' : 'important-markdown.txt');
    // Build sections dynamically
    const sections = [];
    if (mode.summary) {
        sections.push(`\n\n${isTerminal ? 'Summary:' : '### Summary'}\n[Provide a brief summary of what the change does and its purpose]`);
    }
    if (mode.risks) {
        sections.push(`\n\n${isTerminal ? 'Potential Risks:' : '### Potential Risks'}\n[ONLY list CRITICAL risks that would BREAK the build or cause runtime failures. Examples: missing imports that prevent compilation, type errors that block build, deleted exports used elsewhere, circular dependencies causing build failures. DO NOT include minor issues like unused imports, code style, or non-critical concerns. Format as: "- [File: path/to/file] Description (line X)" or write "None" if no critical risks]`);
    }
    if (mode.complexity) {
        sections.push(`\n\n${isTerminal ? 'Complexity:' : '### Complexity'}\n[Rate as a number 1-5, where 1=trivial, 3=moderate, 5=very complex]`);
    }
    const template = loadPrompt('file-analysis.txt');
    return replacePlaceholders(template, {
        analysisContext,
        contentLabel,
        fileContent,
        filePath,
        statusLabel,
        outputFormat: isTerminal ? 'TERMINAL/CLI' : 'MARKDOWN',
        formatSection: formatSection.trim(),
        sections: sections.join(''),
        importantSection: importantSection.trim()
    });
}
function buildSynthesisPrompt(synthesisContent, context, analyzedFilesCount, isTerminal) {
    const instructions = loadPrompt(isTerminal ? 'synthesis-instructions-terminal.txt' : 'synthesis-instructions-markdown.txt');
    const importantSection = loadPrompt(isTerminal ? 'synthesis-important-terminal.txt' : 'synthesis-important-markdown.txt');
    const template = loadPrompt('synthesis.txt');
    return replacePlaceholders(template, {
        analyzedFilesCount: analyzedFilesCount.toString(),
        synthesisContent,
        context: context.join('\n') || 'No additional context',
        instructions: instructions.trim(),
        importantSection: importantSection.trim()
    });
}
//# sourceMappingURL=prompts.js.map