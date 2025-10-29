import { AIProviderConfig, AnalysisResponse, AIProviderType } from './providers/types';
import { PRAnalyzerConfig, ExtendedAnalysisResult } from './types';
export declare function analyzeWithClaude(diff: string, title?: string, apiKey?: string): Promise<string>;
/**
 * Analyze PR with configurable provider
 */
export declare function analyzePR(diff: string, title?: string, config?: AIProviderConfig, repository?: string, prNumber?: number): Promise<AnalysisResponse>;
/**
 * Analyze PR using configuration file
 */
export declare function analyzePRWithConfig(diff: string, title?: string, prConfig?: PRAnalyzerConfig, repository?: string, prNumber?: number, fallbackProviders?: AIProviderType[]): Promise<ExtendedAnalysisResult>;
/**
 * Get available providers
 */
export { getAvailableProviders, isProviderAvailable } from './providers/factory';
