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
}
export declare function getExistingConfig(projectPath: string): UserConfig | null;
export declare function promptFullConfig(projectPath: string, options?: PromptOptions): Promise<{
    answers: PromptAnswers;
    existingConfig: UserConfig | null;
}>;
export declare function promptProvider(defaultProvider?: string): Promise<string>;
export declare function promptApiKey(provider: string): Promise<string>;
export declare function promptConfirm(message: string, defaultValue?: boolean): Promise<boolean>;
export declare function displayConfigSummary(config: UserConfig, configPath: string): void;
//# sourceMappingURL=config-prompts.d.ts.map