export interface AnalysisMode {
    summary: boolean;
    risks: boolean;
    complexity: boolean;
}
export declare function analyzeWithClaude(diff: string, title?: string, apiKey?: string, mode?: AnalysisMode, isCLI?: boolean): Promise<string>;
//# sourceMappingURL=analyzer.d.ts.map