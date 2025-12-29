import { AnthropicProvider } from './anthropic.provider.js';
import { OpenAIProvider } from './openai.provider.js';
import { GoogleProvider } from './google.provider.js';
import { ZhipuProvider } from './zhipu.provider.js';
/**
 * Factory for creating LLM providers
 */
export class ProviderFactory {
    static providers = new Map();
    /**
     * Get or create a provider instance
     */
    static getProvider(providerName, apiKey) {
        // Normalize provider names
        const normalizedName = this.normalizeProviderName(providerName);
        // Check if we already have an instance (unless a specific API key is provided)
        if (!apiKey && this.providers.has(normalizedName)) {
            return this.providers.get(normalizedName);
        }
        // Create new provider instance
        let provider;
        switch (normalizedName) {
            case 'anthropic':
                provider = new AnthropicProvider(apiKey);
                break;
            case 'openai':
                provider = new OpenAIProvider(apiKey);
                break;
            case 'google':
                provider = new GoogleProvider(apiKey);
                break;
            case 'zhipu':
                provider = new ZhipuProvider(apiKey);
                break;
            default:
                throw new Error(`Unsupported provider: ${providerName}. Supported: anthropic, openai, google, zhipu`);
        }
        // Cache the provider if no specific API key was provided
        if (!apiKey) {
            this.providers.set(normalizedName, provider);
        }
        return provider;
    }
    /**
     * Create a chat model with the specified options
     */
    static createChatModel(options = {}) {
        const providerName = options.provider || 'anthropic';
        const provider = this.getProvider(providerName, options.apiKey);
        if (!provider.isConfigured()) {
            throw new Error(`Provider ${providerName} is not configured. Please set the API key.`);
        }
        const config = {
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
        };
        return provider.getChatModel(config);
    }
    /**
     * Get the default model for a provider
     */
    static getDefaultModel(providerName) {
        const provider = this.getProvider(providerName);
        return provider.getDefaultModel();
    }
    /**
     * Check if a provider is configured
     */
    static isProviderConfigured(providerName) {
        try {
            const provider = this.getProvider(providerName);
            return provider.isConfigured();
        }
        catch {
            return false;
        }
    }
    /**
     * Normalize provider name (handle aliases)
     */
    static normalizeProviderName(name) {
        const normalized = name.toLowerCase();
        if (normalized === 'claude')
            return 'anthropic';
        if (normalized === 'gemini')
            return 'google';
        if (normalized === 'glm' || normalized === 'zhipuai')
            return 'zhipu';
        return normalized;
    }
    /**
     * Get list of available providers
     */
    static getAvailableProviders() {
        return ['anthropic', 'openai', 'google', 'zhipu'];
    }
}
//# sourceMappingURL=provider.factory.js.map