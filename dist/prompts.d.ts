/**
 * Prompt loader - loads prompt templates from files at runtime
 * This avoids large string literals in TypeScript code, reducing compilation memory usage
 */
export declare function buildFileAnalysisPrompt(analysisContext: string, fileContent: string, filePath: string, fileStatus: string, isTerminal: boolean, mode: {
    summary?: boolean;
    risks?: boolean;
    complexity?: boolean;
}): string;
export declare function buildSynthesisPrompt(synthesisContent: string, context: string[], analyzedFilesCount: number, isTerminal: boolean): string;
