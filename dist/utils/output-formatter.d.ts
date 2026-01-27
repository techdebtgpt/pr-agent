/**
 * Shared output formatting for CLI and MCP server
 * Supports both terminal (chalk colors) and markdown output modes
 */
export type OutputMode = 'terminal' | 'markdown';
export interface FormatterOptions {
    mode: OutputMode;
    verbose?: boolean;
}
/**
 * Output formatter that can generate terminal or markdown output
 */
export declare class OutputFormatter {
    private mode;
    private verbose;
    constructor(options: FormatterOptions);
    /**
     * Format a section separator line
     */
    separator(): string;
    /**
     * Format a bold title
     */
    bold(text: string): string;
    /**
     * Format a colored title
     */
    title(text: string, color?: 'green' | 'cyan' | 'yellow' | 'blue' | 'red'): string;
    /**
     * Format regular text
     */
    text(text: string): string;
    /**
     * Format gray/dimmed text
     */
    dim(text: string): string;
    /**
     * Format test suggestions section
     */
    formatTestSuggestions(testSuggestions: any[]): string;
    /**
     * Format project classification section
     */
    formatProjectClassification(classification: string | undefined): string;
    /**
     * Format coverage report section
     */
    formatCoverageReport(coverageReport: any): string;
    /**
     * Format DevOps cost estimates section
     */
    formatDevOpsCostEstimates(costEstimates: any[]): string;
    /**
     * Format static analysis section
     */
    formatStaticAnalysis(staticAnalysis: any): string;
}
