// AI Provider Factory
// Factory pattern for creating and managing AI providers

import { BaseAIProvider } from './base';
import { AIProviderConfig, AIProviderType } from './types';
import { PRAnalyzerConfig } from '../types';
import { ClaudeProvider } from './claude';
import { MODEL_DEFAULTS } from './constants';

// Provider registry - will be populated as providers are implemented
const PROVIDER_REGISTRY: Map<AIProviderType, new (config: AIProviderConfig) => BaseAIProvider> = new Map();

// Register available providers
registerProvider('claude', ClaudeProvider);

/**
 * Register a provider class with the factory
 */
export function registerProvider(
  type: AIProviderType, 
  providerClass: new (config: AIProviderConfig) => BaseAIProvider
): void {
  PROVIDER_REGISTRY.set(type, providerClass);
}

/**
 * Create an AI provider instance based on configuration
 */
export function createProvider(config: AIProviderConfig): BaseAIProvider {
  // Validate configuration
  if (!config) {
    throw new Error('Provider configuration is required');
  }

  if (!config.provider) {
    throw new Error('Provider type is required in configuration');
  }

  if (!config.model) {
    throw new Error('Model is required in provider configuration');
  }

  if (typeof config.maxTokens !== 'number' || config.maxTokens <= 0) {
    throw new Error('maxTokens must be a positive number');
  }

  if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
    throw new Error('temperature must be a number between 0 and 2');
  }

  const ProviderClass = PROVIDER_REGISTRY.get(config.provider);
  
  if (!ProviderClass) {
    const availableProviders = Array.from(PROVIDER_REGISTRY.keys()).join(', ');
    console.error(`Failed to create provider: '${config.provider}' not found. Available: ${availableProviders}`);
    throw new Error(`Provider '${config.provider}' is not registered. Available providers: ${availableProviders}`);
  }

  console.info(`Creating ${config.provider} provider with model: ${config.model}`);
  return new ProviderClass(config);
}

/**
 * Create provider from PR analyzer configuration
 */
export function createProviderFromConfig(
  prConfig: PRAnalyzerConfig, 
  providerType?: AIProviderType
): BaseAIProvider {
  const targetProvider = providerType || prConfig.ai.provider;
  const providerConfig = prConfig.ai.providers[targetProvider];
  
  if (!providerConfig) {
    throw new Error(`No configuration found for provider '${targetProvider}'`);
  }

  const aiProviderConfig: AIProviderConfig = {
    provider: targetProvider,
    model: providerConfig.model,
    maxTokens: providerConfig.maxTokens,
    temperature: providerConfig.temperature,
    baseUrl: providerConfig.baseUrl,
    timeout: providerConfig.timeout
  };

  return createProvider(aiProviderConfig);
}

/**
 * Get list of available providers
 */
export function getAvailableProviders(): AIProviderType[] {
  return Array.from(PROVIDER_REGISTRY.keys());
}

/**
 * Check if a provider is available
 */
export function isProviderAvailable(provider: AIProviderType): boolean {
  return PROVIDER_REGISTRY.has(provider);
}

/**
 * Validate provider configuration
 */
export async function validateProviderConfig(config: AIProviderConfig): Promise<boolean> {
  try {
    const provider = createProvider(config);
    return await provider.validateConfig();
  } catch (error) {
    console.error(`Provider validation failed for ${config.provider}:`, error);
    return false;
  }
}

/**
 * Get default configuration for a provider type
 */
export function getDefaultConfig(providerType: AIProviderType): Partial<AIProviderConfig> {
  return {
    provider: providerType,
    ...MODEL_DEFAULTS[providerType]
  };
}
