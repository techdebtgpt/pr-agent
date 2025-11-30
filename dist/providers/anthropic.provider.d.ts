import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ILLMProvider, ProviderConfig } from './provider.interface.js';
/**
 * Anthropic Claude provider implementation
 */
export declare class AnthropicProvider implements ILLMProvider {
    readonly name = "anthropic";
    private readonly apiKey;
    constructor(apiKey?: string);
    isConfigured(): boolean;
    getDefaultModel(): string;
    getChatModel(config?: ProviderConfig): BaseChatModel;
}
