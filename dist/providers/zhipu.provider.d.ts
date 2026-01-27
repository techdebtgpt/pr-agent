import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ILLMProvider, ProviderConfig } from './provider.interface.js';
/**
 * Zhipu AI (智谱AI) provider implementation
 * Uses Anthropic-compatible API endpoint
 * Docs: https://docs.z.ai/
 */
export declare class ZhipuProvider implements ILLMProvider {
    readonly name = "zhipu";
    private readonly apiKey;
    private readonly baseUrl;
    constructor(apiKey?: string);
    isConfigured(): boolean;
    getDefaultModel(): string;
    getChatModel(config?: ProviderConfig): BaseChatModel;
}
