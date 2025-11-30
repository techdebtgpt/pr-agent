import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ILLMProvider, ProviderConfig } from './provider.interface.js';
/**
 * OpenAI GPT provider implementation
 */
export declare class OpenAIProvider implements ILLMProvider {
    readonly name = "openai";
    private readonly apiKey;
    constructor(apiKey?: string);
    isConfigured(): boolean;
    getDefaultModel(): string;
    getChatModel(config?: ProviderConfig): BaseChatModel;
}
