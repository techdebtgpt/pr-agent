export declare function buildClaudeCodeSuggestionPrompt(params: {
    prTitle?: string;
    repo?: string;
    branch?: string;
    filePath?: string | null;
    reviewerComment: string;
    codeSnippet: string;
}): string;
/**
 * Suggest a code fix based on a reviewer inline comment using the existing analyzer.
 * Non-invasive: uses analyzeWithClaude same way src/action.ts does.
 */
export declare function suggestFixFromComment(params: {
    pr: any;
    reviewerComment: string;
    filePath: string;
    codeSnippet: string;
    apiKey?: string;
}): Promise<string>;
/**
 * Minimal helper to prepare a file replacement object.
 * Returns null when suggestion is "NO CHANGE" or empty.
 * Keeps behavior conservative (full file replacement) so it won't modify existing flows unexpectedly.
 */
export declare function prepareFileReplacement(filePath: string, originalContent: string, suggestion: string): {
    path: string;
    newContent: string;
} | null;
