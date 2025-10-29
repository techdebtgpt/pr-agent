export type AIProviderType = 'claude' | 'openai' | 'gemini';
export interface AIProviderConfig {
    provider: AIProviderType;
    model: string;
    maxTokens: number;
    temperature: number;
    apiKey?: string;
    baseUrl?: string;
    timeout?: number;
}
export interface AnalysisRequest {
    diff: string;
    title?: string;
    files?: string[];
    repository?: string;
    prNumber?: number;
}
export interface AnalysisResponse {
    summary: string;
    risks: string[];
    complexity: number;
    recommendations?: string[];
    provider: AIProviderType;
    model: string;
    tokensUsed?: number;
}
export interface ProviderCapabilities {
    maxContextLength: number;
    supportsImages: boolean;
    supportsStreaming: boolean;
    supportsFunctionCalling: boolean;
    rateLimitRpm?: number;
    rateLimitTpm?: number;
}
export interface ProviderError extends Error {
    provider: AIProviderType;
    code?: string;
    statusCode?: number;
    retryable: boolean;
    rateLimited?: boolean;
}
export interface ModelInfo {
    name: string;
    maxTokens: number;
    costPer1kTokens?: {
        input: number;
        output: number;
    };
    capabilities: ProviderCapabilities;
}
export declare function isValidProviderType(value: any): value is AIProviderType;
export declare function isAnalysisResponse(value: any): value is AnalysisResponse;
export declare function isProviderError(error: any): error is ProviderError;
//# sourceMappingURL=types.d.ts.map