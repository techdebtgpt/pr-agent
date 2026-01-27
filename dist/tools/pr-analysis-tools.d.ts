/**
 * PR Analysis Tools for LangChain Agent
 * These tools are used by the agent to analyze different aspects of PR changes
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { DiffFile } from '../types/agent.types.js';
/**
 * Parse git diff into structured file changes
 */
export declare function parseDiff(diff: string): DiffFile[];
/**
 * Create file analyzer tool
 */
export declare function createFileAnalyzerTool(): DynamicStructuredTool<z.ZodObject<{
    filePath: z.ZodString;
    diffContent: z.ZodString;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    diffContent: string;
}, {
    filePath: string;
    diffContent: string;
}>, {
    filePath: string;
    diffContent: string;
}, {
    filePath: string;
    diffContent: string;
}, string, "analyze_file">;
/**
 * Create risk detector tool
 */
export declare function createRiskDetectorTool(): DynamicStructuredTool<z.ZodObject<{
    diff: z.ZodString;
    context: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    diff: string;
    context?: string | undefined;
}, {
    diff: string;
    context?: string | undefined;
}>, {
    diff: string;
    context?: string | undefined;
}, {
    diff: string;
    context?: string | undefined;
}, string, "detect_risks">;
/**
 * Create complexity scorer tool
 */
export declare function createComplexityScorerTool(): DynamicStructuredTool<z.ZodObject<{
    filesAnalyzed: z.ZodArray<z.ZodAny, "many">;
    totalChanges: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    filesAnalyzed: any[];
    totalChanges: number;
}, {
    filesAnalyzed: any[];
    totalChanges: number;
}>, {
    filesAnalyzed: any[];
    totalChanges: number;
}, {
    filesAnalyzed: any[];
    totalChanges: number;
}, string, "score_complexity">;
/**
 * Create summary generator tool
 */
export declare function createSummaryGeneratorTool(): DynamicStructuredTool<z.ZodObject<{
    files: z.ZodArray<z.ZodAny, "many">;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    files: any[];
    title?: string | undefined;
}, {
    files: any[];
    title?: string | undefined;
}>, {
    files: any[];
    title?: string | undefined;
}, {
    files: any[];
    title?: string | undefined;
}, string, "generate_summary">;
/**
 * Create code suggestion tool for fixing issues based on reviewer comments
 */
export declare function createCodeSuggestionTool(): DynamicStructuredTool<z.ZodObject<{
    reviewerComment: z.ZodString;
    codeSnippet: z.ZodString;
    filePath: z.ZodString;
    prTitle: z.ZodOptional<z.ZodString>;
    prContext: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    reviewerComment: string;
    codeSnippet: string;
    prTitle?: string | undefined;
    prContext?: string | undefined;
}, {
    filePath: string;
    reviewerComment: string;
    codeSnippet: string;
    prTitle?: string | undefined;
    prContext?: string | undefined;
}>, {
    filePath: string;
    reviewerComment: string;
    codeSnippet: string;
    prTitle?: string | undefined;
    prContext?: string | undefined;
}, {
    filePath: string;
    reviewerComment: string;
    codeSnippet: string;
    prTitle?: string | undefined;
    prContext?: string | undefined;
}, string, "suggest_code_fix">;
