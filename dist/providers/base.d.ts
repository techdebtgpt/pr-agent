import { AIProviderConfig, AnalysisRequest, AnalysisResponse, ModelInfo, ProviderCapabilities, AIProviderType } from './types';
export declare abstract class BaseAIProvider {
    protected config: AIProviderConfig;
    protected apiKey: string;
    private promptCache;
    constructor(config: AIProviderConfig);
    /**
     * Get the provider type
     */
    abstract getProviderType(): AIProviderType;
    /**
     * Analyze a pull request diff and return structured insights
     */
    abstract analyze(request: AnalysisRequest): Promise<AnalysisResponse>;
    /**
     * Validate the provider configuration
     */
    abstract validateConfig(): Promise<boolean>;
    /**
     * Get information about the configured model
     */
    abstract getModelInfo(): ModelInfo;
    /**
     * Get provider capabilities
     */
    abstract getCapabilities(): ProviderCapabilities;
    /**
     * Get the API key from environment variables
     * Each provider should override this to specify their env var name
     */
    protected abstract getApiKeyFromEnv(): string;
    /**
     * Build the analysis prompt for this provider
     * Can be overridden by providers to optimize for their specific format
     */
    protected buildPrompt(request: AnalysisRequest): string;
    /**
     * Parse the AI response into structured format
     * Can be overridden by providers if they need custom parsing
     */
    protected parseResponse(response: string): Omit<AnalysisResponse, 'provider' | 'model'>;
    /**
     * Handle provider-specific errors
     */
    protected handleError(error: any): never;
    /**
     * Check if the diff is too large for the provider's context window
     */
    protected isDiffTooLarge(diff: string): boolean;
    /**
     * Truncate diff if it's too large
     */
    protected truncateDiff(diff: string): string;
    /**
     * Clear prompt cache (useful for testing)
     */
    protected clearPromptCache(): void;
    /**
     * Get cache size (useful for monitoring)
     */
    protected getPromptCacheSize(): number;
}
//# sourceMappingURL=base.d.ts.map