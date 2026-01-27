/**
 * Coverage Analyzer Tool for PR Analysis
 * Integrates Istanbul/nyc coverage data and ESLint static analysis
 * to provide coverage-based test suggestions
 */
export interface CoverageMetrics {
    statements: {
        covered: number;
        total: number;
        pct: number;
    };
    branches: {
        covered: number;
        total: number;
        pct: number;
    };
    functions: {
        covered: number;
        total: number;
        pct: number;
    };
    lines: {
        covered: number;
        total: number;
        pct: number;
    };
}
export interface FileCoverage {
    path: string;
    metrics: CoverageMetrics;
    uncoveredLines: number[];
    uncoveredBranches: string[];
    uncoveredFunctions: string[];
}
export interface UncoveredCode {
    filePath: string;
    functionName?: string;
    lineRange: {
        start: number;
        end: number;
    };
    type: 'function' | 'branch' | 'statement' | 'line';
    suggestion?: string;
}
export interface CoverageAnalysis {
    overall: CoverageMetrics;
    files: FileCoverage[];
    uncoveredCode: UncoveredCode[];
    timestamp: string;
    hasReport: boolean;
}
export interface StaticAnalysisIssue {
    filePath: string;
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    ruleId: string;
    message: string;
    suggestion?: string;
}
export interface StaticAnalysis {
    issues: StaticAnalysisIssue[];
    summary: {
        errors: number;
        warnings: number;
        info: number;
        fixable: number;
    };
    hasResults: boolean;
}
/**
 * Detect if a coverage report exists and its format
 */
export declare function detectCoverageReport(repoPath?: string): {
    found: boolean;
    format: 'lcov' | 'json' | 'clover' | 'none';
    path: string | null;
};
/**
 * Parse coverage-summary.json (Istanbul/nyc format)
 */
export declare function parseCoverageJson(reportPath: string): CoverageAnalysis;
/**
 * Parse lcov.info format coverage report
 */
export declare function parseLcovReport(reportPath: string): CoverageAnalysis;
/**
 * Run ESLint on specified files or directory
 */
export declare function runEslintAnalysis(targetPath: string, options?: {
    fix?: boolean;
    format?: 'json' | 'stylish';
}): Promise<StaticAnalysis>;
/**
 * Get full coverage analysis from existing reports
 */
export declare function getCoverageAnalysis(repoPath?: string): CoverageAnalysis;
/**
 * Run coverage analysis using nyc (generates report if needed)
 */
export declare function runCoverageAnalysis(repoPath?: string, options?: {
    regenerate?: boolean;
}): Promise<CoverageAnalysis>;
/**
 * Get files with low coverage that need test suggestions
 */
export declare function getLowCoverageFiles(analysis: CoverageAnalysis, threshold?: number): FileCoverage[];
/**
 * Format coverage analysis for CLI output
 */
export declare function formatCoverageReport(analysis: CoverageAnalysis): string;
/**
 * Format static analysis for CLI output
 */
export declare function formatStaticAnalysis(analysis: StaticAnalysis): string;
