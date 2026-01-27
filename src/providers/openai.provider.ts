import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ILLMProvider, ProviderConfig } from './provider.interface.js';

/**
 * OpenAI GPT provider implementation
 */
export class OpenAIProvider implements ILLMProvider {
  public readonly name = 'openai';
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
  }

  public isConfigured(): boolean {
    return !!this.apiKey;
  }

  public getDefaultModel(): string {
    return 'gpt-4-turbo-preview';
  }

  public getChatModel(config: ProviderConfig = {}): BaseChatModel {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key is not configured');
    }

    return new ChatOpenAI({
      apiKey: this.apiKey,
      modelName: config.model || this.getDefaultModel(),
      temperature: config.temperature ?? 0.2,
      maxTokens: config.maxTokens ?? 50000,
    });
  }
}

