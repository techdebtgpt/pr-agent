export interface UserConfig {
    apiKeys?: {
        anthropic?: string;
        openai?: string;
        google?: string;
    };
    ai?: {
        provider?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
    };
    analysis?: {
        defaultMode?: string;
        maxCost?: number;
        autoDetectAgent?: boolean;
        agentThreshold?: number;
    };
    git?: {
        defaultBranch?: string;
        includeUntracked?: boolean;
        excludePatterns?: string[];
    };
    output?: {
        verbose?: boolean;
        showStrategy?: boolean;
        showRecommendations?: boolean;
    };
}
/**
 * Find config file in current directory or parent directories
 */
export declare function findConfigFile(): string | null;
/**
 * Load user configuration from file
 */
export declare function loadUserConfig(verbose?: boolean): Promise<UserConfig>;
/**
 * Check if configuration exists and is valid
 */
export declare function checkConfiguration(): Promise<boolean>;
/**
 * Get API key from config or environment
 */
export declare function getApiKey(provider: string, config?: UserConfig): string | undefined;
/**
 * Save configuration to file
 */
export declare function saveConfig(config: UserConfig, configPath?: string): void;
