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
export declare function findConfigFile(): string | null;
export declare function loadUserConfig(verbose?: boolean): Promise<UserConfig>;
export declare function checkConfiguration(): Promise<boolean>;
export declare function getApiKey(provider: string, config?: UserConfig): string | undefined;
export declare function saveConfig(config: UserConfig, configPath?: string): void;
//# sourceMappingURL=config-loader.d.ts.map