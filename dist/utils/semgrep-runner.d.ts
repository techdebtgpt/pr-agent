/**
 * Semgrep runner utility for static analysis
 * Executes Semgrep and processes results
 */
import { SemgrepResult, SemgrepFinding, SemgrepSummary, SemgrepConfig } from '../types/semgrep.types.js';
/**
 * Check if Semgrep is installed
 */
export declare function isSemgrepInstalled(): Promise<boolean>;
/**
 * Get Semgrep rulesets based on language and framework
 */
export declare function getSemgrepRulesets(language?: string, framework?: string): string[];
/**
 * Run Semgrep analysis on a directory or specific files
 */
export declare function runSemgrepAnalysis(targetPath: string, config: SemgrepConfig, language?: string, framework?: string): Promise<SemgrepResult>;
/**
 * Summarize Semgrep findings
 */
export declare function summarizeSemgrepFindings(result: SemgrepResult): SemgrepSummary;
/**
 * Filter Semgrep findings by changed files
 */
export declare function filterFindingsByChangedFiles(findings: SemgrepFinding[], changedFiles: string[]): SemgrepFinding[];
/**
 * Format Semgrep finding for display
 */
export declare function formatSemgrepFinding(finding: SemgrepFinding): string;
