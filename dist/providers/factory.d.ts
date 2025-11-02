import { BaseAIProvider } from './base';
import { AIProviderConfig, AIProviderType } from './types';
import { PRAnalyzerConfig } from '../types';
/**
 * Register a provider class with the factory
 */
export declare function registerProvider(type: AIProviderType, providerClass: new (config: AIProviderConfig) => BaseAIProvider): void;
/**
 * Create an AI provider instance based on configuration
 */
export declare function createProvider(config: AIProviderConfig): BaseAIProvider;
/**
 * Create provider from PR analyzer configuration
 */
export declare function createProviderFromConfig(prConfig: PRAnalyzerConfig, providerType?: AIProviderType): BaseAIProvider;
/**
 * Get list of available providers
 */
export declare function getAvailableProviders(): AIProviderType[];
/**
 * Check if a provider is available
 */
export declare function isProviderAvailable(provider: AIProviderType): boolean;
/**
 * Validate provider configuration
 */
export declare function validateProviderConfig(config: AIProviderConfig): Promise<boolean>;
/**
 * Get default configuration for a provider type
 */
export declare function getDefaultConfig(providerType: AIProviderType): Partial<AIProviderConfig>;
