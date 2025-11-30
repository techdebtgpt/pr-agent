import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ILLMProvider, ProviderConfig } from './provider.interface.js';
/**
 * Google Gemini provider implementation
 */
export declare class GoogleProvider implements ILLMProvider {
    readonly name = "google";
    private readonly apiKey;
    constructor(apiKey?: string);
    isConfigured(): boolean;
    getDefaultModel(): string;
    getChatModel(config?: ProviderConfig): BaseChatModel;
}
