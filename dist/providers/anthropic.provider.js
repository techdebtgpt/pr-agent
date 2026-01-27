import { ChatAnthropic } from '@langchain/anthropic';
/**
 * Anthropic Claude provider implementation
 */
export class AnthropicProvider {
    name = 'anthropic';
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    }
    isConfigured() {
        return !!this.apiKey;
    }
    getDefaultModel() {
        return 'claude-sonnet-4-5-20250929';
    }
    getChatModel(config = {}) {
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
//# sourceMappingURL=anthropic.provider.js.map