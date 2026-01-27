import { ChatOpenAI } from '@langchain/openai';
/**
 * OpenAI GPT provider implementation
 */
export class OpenAIProvider {
    name = 'openai';
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    }
    isConfigured() {
        return !!this.apiKey;
    }
    getDefaultModel() {
        return 'gpt-4-turbo-preview';
    }
    getChatModel(config = {}) {
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
//# sourceMappingURL=openai.provider.js.map