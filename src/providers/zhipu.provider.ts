import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ILLMProvider, ProviderConfig } from './provider.interface.js';

/**
 * Zhipu AI (智谱AI) provider implementation
 * Uses Anthropic-compatible API endpoint
 * Docs: https://docs.z.ai/
 */
export class ZhipuProvider implements ILLMProvider {
  public readonly name = 'zhipu';
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.z.ai/api/anthropic';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ZHIPU_API_KEY || '';
  }

  public isConfigured(): boolean {
    return !!this.apiKey;
  }

  public getDefaultModel(): string {
    // GLM-4.7 via Z.AI's Anthropic-compatible API
    return 'glm-4.7';
  }

  public getChatModel(config: ProviderConfig = {}): BaseChatModel {
    if (!this.isConfigured()) {
      throw new Error('Zhipu API key is not configured. Set ZHIPU_API_KEY environment variable.');
    }

    return new ChatAnthropic({
      anthropicApiKey: this.apiKey,
      anthropicApiUrl: this.baseUrl,
      modelName: config.model || this.getDefaultModel(),
      temperature: config.temperature ?? 0.2,
      maxTokens: config.maxTokens ?? 50000,
      streaming: true,
    });
  }
}
