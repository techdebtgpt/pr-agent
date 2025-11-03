// AI Provider Types
// Common types and interfaces for multi-provider support

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
  outputFormat?: 'terminal' | 'markdown';
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

// Type guards for runtime type checking
export function isValidProviderType(value: any): value is AIProviderType {
  return ['claude', 'openai', 'gemini'].includes(value);
}

export function isAnalysisResponse(value: any): value is AnalysisResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  return (
    typeof value.summary === 'string' &&
    Array.isArray(value.risks) &&
    typeof value.complexity === 'number' &&
    isValidProviderType(value.provider) &&
    typeof value.model === 'string'
  );
}

export function isProviderError(error: any): error is ProviderError {
  if (!error || !(error instanceof Error)) {
    return false;
  }
  
  return (
    'provider' in error &&
    isValidProviderType((error as any).provider) &&
    'retryable' in error &&
    typeof (error as any).retryable === 'boolean'
  );
}
