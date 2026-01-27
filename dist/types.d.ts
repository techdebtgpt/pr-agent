export type AIProviderType = 'anthropic' | 'openai' | 'google' | 'zhipu';
export interface PRInfo {
    number: number;
    title: string;
    diff: string;
    author: string;
    repository: string;
}
export interface AnalysisResult {
    summary: string;
    risks: string[];
    complexity: number;
}
export interface ExtendedAnalysisResult extends AnalysisResult {
    provider: AIProviderType;
    model: string;
    tokensUsed?: number;
    recommendations?: string[];
}
export interface PRAnalyzerConfig {
    analysis: {
        maxComplexity: number;
        includeRisks: boolean;
        includeComplexity: boolean;
    };
    ai: {
        provider: AIProviderType;
        fallbackProviders?: AIProviderType[];
        providers: {
            [K in AIProviderType]?: {
                model: string;
                maxTokens: number;
                temperature: number;
                baseUrl?: string;
                timeout?: number;
            };
        };
    };
    files: {
        include: string[];
        exclude: string[];
    };
}
