/**
 * Test Suggestion Tool for PR Analysis
 * Generates test code suggestions for code changes without corresponding tests
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
/**
 * Detect test framework from project configuration
 */
export declare function detectTestFramework(repoPath?: string): {
    framework: 'jest' | 'mocha' | 'vitest' | 'pytest' | 'unittest' | 'other';
    detected: boolean;
    configFile?: string;
};
/**
 * Check if a file is a test file
 */
export declare function isTestFile(filePath: string): boolean;
/**
 * Check if a file is a code file that should have tests
 */
export declare function isCodeFile(filePath: string): boolean;
/**
 * Generate test file path suggestion
 */
export declare function suggestTestFilePath(sourceFilePath: string, framework: string): string;
/**
 * Create test suggestion tool
 */
export declare function createTestSuggestionTool(): DynamicStructuredTool<z.ZodObject<{
    files: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        diff: z.ZodString;
        additions: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        path: string;
        diff: string;
        additions: number;
    }, {
        path: string;
        diff: string;
        additions: number;
    }>, "many">;
    framework: z.ZodOptional<z.ZodString>;
    repoPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    files: {
        path: string;
        diff: string;
        additions: number;
    }[];
    repoPath?: string | undefined;
    framework?: string | undefined;
}, {
    files: {
        path: string;
        diff: string;
        additions: number;
    }[];
    repoPath?: string | undefined;
    framework?: string | undefined;
}>, {
    files: {
        path: string;
        diff: string;
        additions: number;
    }[];
    repoPath?: string | undefined;
    framework?: string | undefined;
}, {
    files: {
        path: string;
        diff: string;
        additions: number;
    }[];
    repoPath?: string | undefined;
    framework?: string | undefined;
}, string, "suggest_tests">;
/**
 * Generate test code template based on framework and code
 */
export declare function generateTestTemplate(framework: string, filePath: string, codeSnippet: string, functionNames?: string[]): string;
/**
 * Test Enhancement Suggestion - analyzes existing tests and suggests improvements
 */
export interface TestEnhancement {
    testFile: string;
    sourceFile: string;
    currentTests: string[];
    missingScenarios: string[];
    suggestions: string[];
    enhancementCode?: string;
}
/**
 * Analyze existing test file and suggest enhancements
 */
export declare function analyzeTestQuality(testFile: {
    path: string;
    diff: string;
}, sourceFile: {
    path: string;
    diff: string;
}, framework: string): TestEnhancement;
/**
 * Format test enhancement for display
 */
export declare function formatTestEnhancement(enhancement: TestEnhancement): string;
