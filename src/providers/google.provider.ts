import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ILLMProvider, ProviderConfig } from './provider.interface.js';

/**
 * Google Gemini provider implementation
 */
export class GoogleProvider implements ILLMProvider {
  public readonly name = 'google';
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_API_KEY || '';
  }

  public isConfigured(): boolean {
    return !!this.apiKey;
  }

  public getDefaultModel(): string {
    return 'gemini-pro';
  }

  public getChatModel(config: ProviderConfig = {}): BaseChatModel {
    if (!this.isConfigured()) {
      throw new Error('Google API key is not configured');
    }

    return new ChatGoogleGenerativeAI({
      apiKey: this.apiKey,
      model: config.model || this.getDefaultModel(),
      temperature: config.temperature ?? 0.2,
      maxOutputTokens: config.maxTokens ?? 50000,
    });
  }
}
