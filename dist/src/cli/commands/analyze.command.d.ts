interface AnalyzeOptions {
    diff?: string;
    file?: string;
    staged?: boolean;
    branch?: string;
    title?: string;
    provider?: string;
    model?: string;
    agent?: boolean;
    summary?: boolean;
    risks?: boolean;
    complexity?: boolean;
    full?: boolean;
    verbose?: boolean;
    maxCost?: number;
}
export declare function analyzePR(options?: AnalyzeOptions): Promise<void>;
export {};
//# sourceMappingURL=analyze.command.d.ts.map