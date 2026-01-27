import { ILLMProvider } from './provider.interface.js';
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
export declare class ProviderFactory {
    private static providers;
    /**
     * Get or create a provider instance
     */
    static getProvider(providerName: SupportedProvider, apiKey?: string): ILLMProvider;
    /**
     * Create a chat model with the specified options
     */
    static createChatModel(options?: ProviderOptions): BaseChatModel;
    /**
     * Get the default model for a provider
     */
    static getDefaultModel(providerName: SupportedProvider): string;
    /**
     * Check if a provider is configured
     */
    static isProviderConfigured(providerName: SupportedProvider): boolean;
    /**
     * Normalize provider name (handle aliases)
     */
    private static normalizeProviderName;
    /**
     * Get list of available providers
     */
    static getAvailableProviders(): SupportedProvider[];
}
