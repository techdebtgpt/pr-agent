// PR Agent - Basic Types
// Core types for PR analysis

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

// Extended types for multi-provider support
export interface ExtendedAnalysisResult extends AnalysisResult {
  provider: AIProviderType;
  model: string;
  tokensUsed?: number;
  recommendations?: string[];
}

// Configuration types
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
