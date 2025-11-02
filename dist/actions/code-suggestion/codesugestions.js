"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildClaudeCodeSuggestionPrompt = buildClaudeCodeSuggestionPrompt;
exports.suggestFixFromComment = suggestFixFromComment;
exports.prepareFileReplacement = prepareFileReplacement;
const analyzer_1 = require("../../analyzer");
function buildClaudeCodeSuggestionPrompt(params) {
    const { prTitle, repo, branch, filePath, reviewerComment, codeSnippet } = params;
    return `
You are an expert software engineer and code-fixer. You will take a reviewer comment and the associated code snippet and produce the corrected code snippet only.

Context:
- Repo: ${repo ?? "(unknown)"}
- Branch: ${branch ?? "(unknown)"}
- PR Title: ${prTitle ?? "(unknown)"}
- File: ${filePath ?? "(unknown)"}

Reviewer comment:
${reviewerComment.trim()}

Original code snippet:
\`\`\`
${codeSnippet}
\`\`\`

Task:
1) Apply the reviewer’s requested changes to the provided code snippet.
2) Output rules (MUST follow exactly):
   - Return only the corrected code snippet (no explanations, no markdown fences, no extra text).
   - If only a few lines changed you may return only the updated lines, but prefer returning the full corrected snippet when structural/context changes are required.
   - Preserve original code style and indentation.
   - If no changes are needed, reply with exactly: NO CHANGE
   - Do not include filenames, metadata, or commentary.

Produce the corrected code now.
`.trim();
}
/**
 * Suggest a code fix based on a reviewer inline comment using the existing analyzer.
 * Non-invasive: uses analyzeWithClaude same way src/action.ts does.
 */
async function suggestFixFromComment(params) {
    const { pr, reviewerComment, filePath, codeSnippet } = params;
    const apiKey = params.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required for code suggestions');
    }
    const prompt = buildClaudeCodeSuggestionPrompt({
        prTitle: pr?.title,
        repo: pr?.repo ?? undefined,
        branch: pr?.branch ?? undefined,
        filePath,
        reviewerComment,
        codeSnippet,
    });
    // analyzeWithClaude in this repo is used as analyzeWithClaude(text, title, apiKey)
    const title = pr?.title ?? undefined;
    const result = await (0, analyzer_1.analyzeWithClaude)(prompt, title, apiKey);
    return (typeof result === 'string' ? result : String(result)).trim();
}
/**
 * Minimal helper to prepare a file replacement object.
 * Returns null when suggestion is "NO CHANGE" or empty.
 * Keeps behavior conservative (full file replacement) so it won't modify existing flows unexpectedly.
 */
function prepareFileReplacement(filePath, originalContent, suggestion) {
    const trimmed = suggestion?.trim?.();
    if (!trimmed || trimmed === 'NO CHANGE')
        return null;
    // Default to full replacement to avoid risky partial patching automatically.
    return {
        path: filePath,
        newContent: trimmed
    };
}
//# sourceMappingURL=codesugestions.js.map