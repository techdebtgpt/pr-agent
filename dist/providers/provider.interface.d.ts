import { BaseChatModel } from '@langchain/core/language_models/chat_models';
/**
 * LLM Provider configuration options
 */
export interface ProviderConfig {
    model?: string;
    temperature?: number;
    maxTokens?: number;
}
/**
 * Base interface for LLM providers
 */
export interface ILLMProvider {
    /** Provider name */
    readonly name: string;
    /** Get chat model instance */
    getChatModel(config: ProviderConfig): BaseChatModel;
    /** Get default model for this provider */
    getDefaultModel(): string;
    /** Check if provider is configured (has API key) */
    isConfigured(): boolean;
}
