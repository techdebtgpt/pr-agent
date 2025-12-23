import { UserConfig } from './config-loader.js';
export interface PromptOptions {
    includeApiKey?: boolean;
    includeAnalysisPreferences?: boolean;
    verbose?: boolean;
}
export interface PromptAnswers {
    provider: string;
    selectedModel: string;
    apiKey?: string;
    saveApiKey?: boolean;
    defaultMode?: string;
    autoDetectAgent?: boolean;
    language?: string;
    framework?: string;
    enableStaticAnalysis?: boolean;
}
/**
 * Get existing configuration if available
 */
export declare function getExistingConfig(projectPath: string): UserConfig | null;
/**
 * Prompt for full configuration
 */
export declare function promptFullConfig(projectPath: string, options?: PromptOptions): Promise<{
    answers: PromptAnswers;
    existingConfig: UserConfig | null;
}>;
/**
 * Prompt for provider selection only
 */
export declare function promptProvider(defaultProvider?: string): Promise<string>;
/**
 * Prompt for API key
 */
export declare function promptApiKey(provider: string): Promise<string>;
/**
 * Prompt for confirmation
 */
export declare function promptConfirm(message: string, defaultValue?: boolean): Promise<boolean>;
/**
 * Display success message with configuration summary
 */
export declare function displayConfigSummary(config: UserConfig, configPath: string): void;
