import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
/**
 * Google Gemini provider implementation
 */
export class GoogleProvider {
    name = 'google';
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.GOOGLE_API_KEY || '';
    }
    isConfigured() {
        return !!this.apiKey;
    }
    getDefaultModel() {
        return 'gemini-pro';
    }
    getChatModel(config = {}) {
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
//# sourceMappingURL=google.provider.js.map