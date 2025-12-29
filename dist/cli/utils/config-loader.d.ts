export interface UserConfig {
    apiKeys?: {
        anthropic?: string;
        openai?: string;
        google?: string;
        zhipu?: string;
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
        language?: string;
        framework?: string;
        enableStaticAnalysis?: boolean;
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
    /**
     * Peer Review configuration - integrates with issue trackers (Jira, etc.)
     * to validate PRs against tickets and acceptance criteria
     */
    peerReview?: {
        enabled?: boolean;
        provider?: string;
        useMcp?: boolean;
        instanceUrl?: string;
        email?: string;
        apiToken?: string;
        defaultProject?: string;
        acceptanceCriteriaField?: string;
        storyPointsField?: string;
        ticketPatterns?: string[];
        analyzeAcceptanceCriteria?: boolean;
        rateTicketQuality?: boolean;
        generateTestSuggestions?: boolean;
        checkScopeCreep?: boolean;
        includeTicketDetails?: boolean;
        verbose?: boolean;
    };
}
/**
 * Find config file in current directory or parent directories
 */
export declare function findConfigFile(): string | null;
/**
 * Load user configuration from file
 */
export declare function loadUserConfig(verbose?: boolean, validate?: boolean): Promise<UserConfig>;
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
