/**
 * DevOps Cost Estimator Tool for PR Analysis
 * Estimates AWS infrastructure costs for DevOps-related changes (IaC, Dockerfiles, etc.)
 * Uses MCP to connect to AWS for cost estimation when available
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { DevOpsCostEstimate } from '../types/agent.types.js';
/**
 * Check if a file is a DevOps-related file
 */
export declare function isDevOpsFile(filePath: string): {
    isDevOps: boolean;
    type: string | null;
};
/**
 * Analyze DevOps files and estimate costs
 */
export declare function analyzeDevOpsFiles(files: Array<{
    path: string;
    diff: string;
}>): {
    hasDevOpsChanges: boolean;
    fileTypes: string[];
    estimates: DevOpsCostEstimate[];
    totalEstimatedCost: number;
};
/**
 * Create DevOps cost estimator tool
 */
export declare function createDevOpsCostEstimatorTool(): DynamicStructuredTool<z.ZodObject<{
    files: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        diff: z.ZodString;
    }, z.core.$strip>>;
    awsCredentials: z.ZodOptional<z.ZodObject<{
        accessKeyId: z.ZodOptional<z.ZodString>;
        secretAccessKey: z.ZodOptional<z.ZodString>;
        region: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, {
    files: Array<{
        path: string;
        diff: string;
    }>;
    awsCredentials?: {
        accessKeyId?: string;
        secretAccessKey?: string;
        region?: string;
    };
}, {
    files: {
        path: string;
        diff: string;
    }[];
    awsCredentials?: {
        accessKeyId?: string | undefined;
        secretAccessKey?: string | undefined;
        region?: string | undefined;
    } | undefined;
}, string>;
/**
 * Format cost estimates for display
 */
export declare function formatCostEstimates(estimates: DevOpsCostEstimate[], totalCost: number): string;
