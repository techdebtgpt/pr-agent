import { ChatAnthropic } from '@langchain/anthropic';
/**
 * Zhipu AI (智谱AI) provider implementation
 * Uses Anthropic-compatible API endpoint
 * Docs: https://docs.z.ai/
 */
export class ZhipuProvider {
    name = 'zhipu';
    apiKey;
    baseUrl = 'https://api.z.ai/api/anthropic';
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.ZHIPU_API_KEY || '';
    }
    isConfigured() {
        return !!this.apiKey;
    }
    getDefaultModel() {
        // GLM-4.7 via Z.AI's Anthropic-compatible API
        return 'glm-4.7';
    }
    getChatModel(config = {}) {
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
//# sourceMappingURL=zhipu.provider.js.map