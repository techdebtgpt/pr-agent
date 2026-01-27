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
        zhipu: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        anthropic?: string | undefined;
        openai?: string | undefined;
        google?: string | undefined;
        zhipu?: string | undefined;
    }, {
        anthropic?: string | undefined;
        openai?: string | undefined;
        google?: string | undefined;
        zhipu?: string | undefined;
    }>>;
    ai: z.ZodOptional<z.ZodObject<{
        provider: z.ZodOptional<z.ZodEnum<["anthropic", "openai", "google", "zhipu"]>>;
        model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        provider?: "anthropic" | "openai" | "google" | "zhipu" | undefined;
        model?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
    }, {
        provider?: "anthropic" | "openai" | "google" | "zhipu" | undefined;
        model?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
    }>>;
    analysis: z.ZodOptional<z.ZodObject<{
        defaultMode: z.ZodOptional<z.ZodEnum<["full", "summary", "risks", "complexity"]>>;
        maxCost: z.ZodOptional<z.ZodNumber>;
        autoDetectAgent: z.ZodOptional<z.ZodBoolean>;
        agentThreshold: z.ZodOptional<z.ZodNumber>;
        language: z.ZodOptional<z.ZodString>;
        framework: z.ZodOptional<z.ZodString>;
        enableStaticAnalysis: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        language?: string | undefined;
        framework?: string | undefined;
        defaultMode?: "summary" | "complexity" | "risks" | "full" | undefined;
        autoDetectAgent?: boolean | undefined;
        enableStaticAnalysis?: boolean | undefined;
        maxCost?: number | undefined;
        agentThreshold?: number | undefined;
    }, {
        language?: string | undefined;
        framework?: string | undefined;
        defaultMode?: "summary" | "complexity" | "risks" | "full" | undefined;
        autoDetectAgent?: boolean | undefined;
        enableStaticAnalysis?: boolean | undefined;
        maxCost?: number | undefined;
        agentThreshold?: number | undefined;
    }>>;
    git: z.ZodOptional<z.ZodObject<{
        defaultBranch: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        includeUntracked: z.ZodOptional<z.ZodBoolean>;
        excludePatterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        defaultBranch?: string | undefined;
        includeUntracked?: boolean | undefined;
        excludePatterns?: string[] | undefined;
    }, {
        defaultBranch?: string | undefined;
        includeUntracked?: boolean | undefined;
        excludePatterns?: string[] | undefined;
    }>>;
    output: z.ZodOptional<z.ZodObject<{
        verbose: z.ZodOptional<z.ZodBoolean>;
        showStrategy: z.ZodOptional<z.ZodBoolean>;
        showRecommendations: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        verbose?: boolean | undefined;
        showStrategy?: boolean | undefined;
        showRecommendations?: boolean | undefined;
    }, {
        verbose?: boolean | undefined;
        showStrategy?: boolean | undefined;
        showRecommendations?: boolean | undefined;
    }>>;
    peerReview: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        provider: z.ZodOptional<z.ZodString>;
        useMcp: z.ZodOptional<z.ZodBoolean>;
        instanceUrl: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
        apiToken: z.ZodOptional<z.ZodString>;
        defaultProject: z.ZodOptional<z.ZodString>;
        acceptanceCriteriaField: z.ZodOptional<z.ZodString>;
        storyPointsField: z.ZodOptional<z.ZodString>;
        ticketPatterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        analyzeAcceptanceCriteria: z.ZodOptional<z.ZodBoolean>;
        rateTicketQuality: z.ZodOptional<z.ZodBoolean>;
        generateTestSuggestions: z.ZodOptional<z.ZodBoolean>;
        checkScopeCreep: z.ZodOptional<z.ZodBoolean>;
        includeTicketDetails: z.ZodOptional<z.ZodBoolean>;
        verbose: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        provider?: string | undefined;
        email?: string | undefined;
        enabled?: boolean | undefined;
        useMcp?: boolean | undefined;
        instanceUrl?: string | undefined;
        apiToken?: string | undefined;
        defaultProject?: string | undefined;
        acceptanceCriteriaField?: string | undefined;
        storyPointsField?: string | undefined;
        ticketPatterns?: string[] | undefined;
        verbose?: boolean | undefined;
        analyzeAcceptanceCriteria?: boolean | undefined;
        rateTicketQuality?: boolean | undefined;
        generateTestSuggestions?: boolean | undefined;
        checkScopeCreep?: boolean | undefined;
        includeTicketDetails?: boolean | undefined;
    }, {
        provider?: string | undefined;
        email?: string | undefined;
        enabled?: boolean | undefined;
        useMcp?: boolean | undefined;
        instanceUrl?: string | undefined;
        apiToken?: string | undefined;
        defaultProject?: string | undefined;
        acceptanceCriteriaField?: string | undefined;
        storyPointsField?: string | undefined;
        ticketPatterns?: string[] | undefined;
        verbose?: boolean | undefined;
        analyzeAcceptanceCriteria?: boolean | undefined;
        rateTicketQuality?: boolean | undefined;
        generateTestSuggestions?: boolean | undefined;
        checkScopeCreep?: boolean | undefined;
        includeTicketDetails?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    ai?: {
        provider?: "anthropic" | "openai" | "google" | "zhipu" | undefined;
        model?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
    } | undefined;
    peerReview?: {
        provider?: string | undefined;
        email?: string | undefined;
        enabled?: boolean | undefined;
        useMcp?: boolean | undefined;
        instanceUrl?: string | undefined;
        apiToken?: string | undefined;
        defaultProject?: string | undefined;
        acceptanceCriteriaField?: string | undefined;
        storyPointsField?: string | undefined;
        ticketPatterns?: string[] | undefined;
        verbose?: boolean | undefined;
        analyzeAcceptanceCriteria?: boolean | undefined;
        rateTicketQuality?: boolean | undefined;
        generateTestSuggestions?: boolean | undefined;
        checkScopeCreep?: boolean | undefined;
        includeTicketDetails?: boolean | undefined;
    } | undefined;
    output?: {
        verbose?: boolean | undefined;
        showStrategy?: boolean | undefined;
        showRecommendations?: boolean | undefined;
    } | undefined;
    analysis?: {
        language?: string | undefined;
        framework?: string | undefined;
        defaultMode?: "summary" | "complexity" | "risks" | "full" | undefined;
        autoDetectAgent?: boolean | undefined;
        enableStaticAnalysis?: boolean | undefined;
        maxCost?: number | undefined;
        agentThreshold?: number | undefined;
    } | undefined;
    git?: {
        defaultBranch?: string | undefined;
        includeUntracked?: boolean | undefined;
        excludePatterns?: string[] | undefined;
    } | undefined;
    apiKeys?: {
        anthropic?: string | undefined;
        openai?: string | undefined;
        google?: string | undefined;
        zhipu?: string | undefined;
    } | undefined;
}, {
    ai?: {
        provider?: "anthropic" | "openai" | "google" | "zhipu" | undefined;
        model?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
    } | undefined;
    peerReview?: {
        provider?: string | undefined;
        email?: string | undefined;
        enabled?: boolean | undefined;
        useMcp?: boolean | undefined;
        instanceUrl?: string | undefined;
        apiToken?: string | undefined;
        defaultProject?: string | undefined;
        acceptanceCriteriaField?: string | undefined;
        storyPointsField?: string | undefined;
        ticketPatterns?: string[] | undefined;
        verbose?: boolean | undefined;
        analyzeAcceptanceCriteria?: boolean | undefined;
        rateTicketQuality?: boolean | undefined;
        generateTestSuggestions?: boolean | undefined;
        checkScopeCreep?: boolean | undefined;
        includeTicketDetails?: boolean | undefined;
    } | undefined;
    output?: {
        verbose?: boolean | undefined;
        showStrategy?: boolean | undefined;
        showRecommendations?: boolean | undefined;
    } | undefined;
    analysis?: {
        language?: string | undefined;
        framework?: string | undefined;
        defaultMode?: "summary" | "complexity" | "risks" | "full" | undefined;
        autoDetectAgent?: boolean | undefined;
        enableStaticAnalysis?: boolean | undefined;
        maxCost?: number | undefined;
        agentThreshold?: number | undefined;
    } | undefined;
    git?: {
        defaultBranch?: string | undefined;
        includeUntracked?: boolean | undefined;
        excludePatterns?: string[] | undefined;
    } | undefined;
    apiKeys?: {
        anthropic?: string | undefined;
        openai?: string | undefined;
        google?: string | undefined;
        zhipu?: string | undefined;
    } | undefined;
}>;
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
