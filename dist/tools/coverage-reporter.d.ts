/**
 * Coverage Reporter Tool for PR Analysis
 * Reads coverage reports and extracts metrics when coverage tool is configured
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { CoverageReport } from '../types/agent.types.js';
/**
 * Detect if coverage tool is configured in the project
 */
export declare function detectCoverageTool(repoPath?: string): {
    tool: string | null;
    configured: boolean;
    coveragePath?: string;
};
/**
 * Find existing coverage report files
 */
export declare function findCoverageFiles(repoPath?: string): string[];
/**
 * Read and parse coverage report
 */
export declare function readCoverageReport(repoPath?: string): CoverageReport;
/**
 * Create coverage reporter tool
 */
export declare function createCoverageReporterTool(): DynamicStructuredTool<z.ZodObject<{
    repoPath: z.ZodOptional<z.ZodString>;
    forceRead: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    repoPath?: string | undefined;
    forceRead?: boolean | undefined;
}, {
    repoPath?: string | undefined;
    forceRead?: boolean | undefined;
}>, {
    repoPath?: string;
    forceRead?: boolean;
}, {
    repoPath?: string | undefined;
    forceRead?: boolean | undefined;
}, string, "report_coverage">;
/**
 * Format coverage report for display
 */
export declare function formatCoverageReport(report: CoverageReport): string;
