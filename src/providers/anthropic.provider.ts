import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ILLMProvider, ProviderConfig } from './provider.interface.js';

/**
 * Anthropic Claude provider implementation
 */
export class AnthropicProvider implements ILLMProvider {
  public readonly name = 'anthropic';
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
  }

  public isConfigured(): boolean {
    return !!this.apiKey;
  }

  public getDefaultModel(): string {
    return 'claude-sonnet-4-5-20250929';
  }

  public getChatModel(config: ProviderConfig = {}): BaseChatModel {
    if (!this.isConfigured()) {
      throw new Error('Anthropic API key is not configured');
    }

    return new ChatAnthropic({
      apiKey: this.apiKey,
      modelName: config.model || this.getDefaultModel(),
      temperature: config.temperature ?? 0.2,
      maxTokens: config.maxTokens ?? 50000,
      streaming: true,
    });
  }
}

