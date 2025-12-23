/**
 * Configuration validation using Zod
 */
import { z } from 'zod';
import { UserConfig } from '../cli/utils/config-loader.js';
/**
 * Zod schema for validating UserConfig
 */
export declare const UserConfigSchema: z.ZodObject<{
    apiKeys: z.ZodOptional<z.ZodObject<{
        anthropic: z.ZodOptional<z.ZodString>;
        openai: z.ZodOptional<z.ZodString>;
        google: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    ai: z.ZodOptional<z.ZodObject<{
        provider: z.ZodOptional<z.ZodEnum<{
            anthropic: "anthropic";
            openai: "openai";
            google: "google";
        }>>;
        model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    analysis: z.ZodOptional<z.ZodObject<{
        defaultMode: z.ZodOptional<z.ZodEnum<{
            summary: "summary";
            full: "full";
            risks: "risks";
            complexity: "complexity";
        }>>;
        maxCost: z.ZodOptional<z.ZodNumber>;
        autoDetectAgent: z.ZodOptional<z.ZodBoolean>;
        agentThreshold: z.ZodOptional<z.ZodNumber>;
        language: z.ZodOptional<z.ZodString>;
        framework: z.ZodOptional<z.ZodString>;
        enableStaticAnalysis: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    git: z.ZodOptional<z.ZodObject<{
        defaultBranch: z.ZodOptional<z.ZodString>;
        includeUntracked: z.ZodOptional<z.ZodBoolean>;
        excludePatterns: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    output: z.ZodOptional<z.ZodObject<{
        verbose: z.ZodOptional<z.ZodBoolean>;
        showStrategy: z.ZodOptional<z.ZodBoolean>;
        showRecommendations: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Validate configuration object
 */
export declare function validateConfig(config: UserConfig): {
    success: boolean;
    errors: string[];
    sanitizedConfig?: UserConfig;
};
/**
 * Validate and throw if invalid
 */
export declare function validateConfigOrThrow(config: UserConfig, configPath?: string): UserConfig;
