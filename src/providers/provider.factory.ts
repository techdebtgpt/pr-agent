import { ILLMProvider, ProviderConfig } from './provider.interface.js';
import { AnthropicProvider } from './anthropic.provider.js';
import { OpenAIProvider } from './openai.provider.js';
import { GoogleProvider } from './google.provider.js';
import { ZhipuProvider } from './zhipu.provider.js';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type SupportedProvider = 'anthropic' | 'openai' | 'google' | 'zhipu';

export interface ProviderOptions {
  provider?: SupportedProvider;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Factory for creating LLM providers
 */
export class ProviderFactory {
  private static providers: Map<string, ILLMProvider> = new Map();

  /**
   * Get or create a provider instance
   */
  public static getProvider(
    providerName: SupportedProvider,
    apiKey?: string
  ): ILLMProvider {
    // Normalize provider names
    const normalizedName = this.normalizeProviderName(providerName);
    
    // Check if we already have an instance (unless a specific API key is provided)
    if (!apiKey && this.providers.has(normalizedName)) {
      return this.providers.get(normalizedName)!;
    }

    // Create new provider instance
    let provider: ILLMProvider;
    
    switch (normalizedName) {
      case 'anthropic':
        provider = new AnthropicProvider(apiKey);
        break;
      case 'openai':
        provider = new OpenAIProvider(apiKey);
        break;
      case 'google':
        provider = new GoogleProvider(apiKey);
        break;
      case 'zhipu':
        provider = new ZhipuProvider(apiKey);
        break;
      default:
        throw new Error(`Unsupported provider: ${providerName}. Supported: anthropic, openai, google, zhipu`);
    }

    // Cache the provider if no specific API key was provided
    if (!apiKey) {
      this.providers.set(normalizedName, provider);
    }

    return provider;
  }

  /**
   * Create a chat model with the specified options
   */
  public static createChatModel(options: ProviderOptions = {}): BaseChatModel {
    const providerName = options.provider || 'anthropic';
    const provider = this.getProvider(providerName, options.apiKey);

    if (!provider.isConfigured()) {
      throw new Error(
        `Provider ${providerName} is not configured. Please set the API key.`
      );
    }

    const config: ProviderConfig = {
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    };

    return provider.getChatModel(config);
  }

  /**
   * Get the default model for a provider
   */
  public static getDefaultModel(providerName: SupportedProvider): string {
    const provider = this.getProvider(providerName);
    return provider.getDefaultModel();
  }

  /**
   * Check if a provider is configured
   */
  public static isProviderConfigured(providerName: SupportedProvider): boolean {
    try {
      const provider = this.getProvider(providerName);
      return provider.isConfigured();
    } catch {
      return false;
    }
  }

  /**
   * Normalize provider name (handle aliases)
   */
  private static normalizeProviderName(name: SupportedProvider): string {
    const normalized = name.toLowerCase();
    if (normalized === 'claude') return 'anthropic';
    if (normalized === 'gemini') return 'google';
    if (normalized === 'glm' || normalized === 'zhipuai') return 'zhipu';
    return normalized;
  }

  /**
   * Get list of available providers
   */
  public static getAvailableProviders(): SupportedProvider[] {
    return ['anthropic', 'openai', 'google', 'zhipu'];
  }
}

