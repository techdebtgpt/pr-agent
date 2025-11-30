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
}, z.core.$strip>, {
    filePath: string;
    diffContent: string;
}, {
    filePath: string;
    diffContent: string;
}, string>;
/**
 * Create risk detector tool
 */
export declare function createRiskDetectorTool(): DynamicStructuredTool<z.ZodObject<{
    diff: z.ZodString;
    context: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, {
    diff: string;
    context?: string | undefined;
}, {
    diff: string;
    context?: string | undefined;
}, string>;
/**
 * Create complexity scorer tool
 */
export declare function createComplexityScorerTool(): DynamicStructuredTool<z.ZodObject<{
    filesAnalyzed: z.ZodArray<z.ZodAny>;
    totalChanges: z.ZodNumber;
}, z.core.$strip>, {
    filesAnalyzed: any[];
    totalChanges: number;
}, {
    filesAnalyzed: any[];
    totalChanges: number;
}, string>;
/**
 * Create summary generator tool
 */
export declare function createSummaryGeneratorTool(): DynamicStructuredTool<z.ZodObject<{
    files: z.ZodArray<z.ZodAny>;
    title: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, {
    files: any[];
    title?: string | undefined;
}, {
    files: any[];
    title?: string | undefined;
}, string>;
/**
 * Create code suggestion tool for fixing issues based on reviewer comments
 */
export declare function createCodeSuggestionTool(): DynamicStructuredTool<z.ZodObject<{
    reviewerComment: z.ZodString;
    codeSnippet: z.ZodString;
    filePath: z.ZodString;
    prTitle: z.ZodOptional<z.ZodString>;
    prContext: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, {
    reviewerComment: string;
    codeSnippet: string;
    filePath: string;
    prTitle?: string | undefined;
    prContext?: string | undefined;
}, {
    reviewerComment: string;
    codeSnippet: string;
    filePath: string;
    prTitle?: string | undefined;
    prContext?: string | undefined;
}, string>;
