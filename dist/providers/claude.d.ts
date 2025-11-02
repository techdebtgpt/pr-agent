import { BaseAIProvider } from './base';
import { AIProviderConfig, AnalysisRequest, AnalysisResponse, ModelInfo, ProviderCapabilities, AIProviderType } from './types';
export declare class ClaudeProvider extends BaseAIProvider {
    private anthropic;
    constructor(config: AIProviderConfig);
    getProviderType(): AIProviderType;
    protected getApiKeyFromEnv(): string;
    analyze(request: AnalysisRequest): Promise<AnalysisResponse>;
    validateConfig(): Promise<boolean>;
    getModelInfo(): ModelInfo;
    getCapabilities(): ProviderCapabilities;
    /**
     * Claude-optimized prompt building
     */
    protected buildPrompt(request: AnalysisRequest): string;
}
