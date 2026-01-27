/**
 * Project Classifier Tool
 *
 * Distinguishes between business logic and QA projects based on file patterns,
 * content analysis, and project structure. This helps tailor analysis and
 * recommendations to the project type.
 *
 * Business Logic Projects:
 * - Focus on feature implementation, data models, APIs, business rules
 * - Should prioritize: architecture review, performance, security
 *
 * QA/Test Projects:
 * - Focus on testing, automation, test frameworks
 * - Should prioritize: test coverage, test quality, maintainability
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
export interface ProjectClassification {
    projectType: 'business_logic' | 'qa_testing' | 'mixed' | 'unknown';
    confidence: number;
    signals: {
        businessLogicSignals: string[];
        qaTestingSignals: string[];
    };
    recommendations: string[];
}
/**
 * Classify a project based on changed files
 */
export declare function classifyProject(changedFiles: Array<{
    filename: string;
    patch?: string;
}>): ProjectClassification;
/**
 * Format classification results for display
 */
export declare function formatClassification(classification: ProjectClassification): string;
/**
 * LangChain tool for project classification
 */
export declare function createProjectClassifierTool(): DynamicStructuredTool<z.ZodObject<{
    changedFiles: z.ZodArray<z.ZodObject<{
        filename: z.ZodString;
        patch: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        filename: string;
        patch?: string | undefined;
    }, {
        filename: string;
        patch?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    changedFiles: {
        filename: string;
        patch?: string | undefined;
    }[];
}, {
    changedFiles: {
        filename: string;
        patch?: string | undefined;
    }[];
}>, {
    changedFiles: {
        filename: string;
        patch?: string | undefined;
    }[];
}, {
    changedFiles: {
        filename: string;
        patch?: string | undefined;
    }[];
}, string, "classify_project_type">;
