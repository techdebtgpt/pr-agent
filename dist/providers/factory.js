"use strict";
// AI Provider Factory
// Factory pattern for creating and managing AI providers
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProvider = registerProvider;
exports.createProvider = createProvider;
exports.createProviderFromConfig = createProviderFromConfig;
exports.getAvailableProviders = getAvailableProviders;
exports.isProviderAvailable = isProviderAvailable;
exports.validateProviderConfig = validateProviderConfig;
exports.getDefaultConfig = getDefaultConfig;
const claude_1 = require("./claude");
const constants_1 = require("./constants");
// Provider registry - will be populated as providers are implemented
const PROVIDER_REGISTRY = new Map();
// Register available providers
registerProvider('claude', claude_1.ClaudeProvider);
/**
 * Register a provider class with the factory
 */
function registerProvider(type, providerClass) {
    PROVIDER_REGISTRY.set(type, providerClass);
}
/**
 * Create an AI provider instance based on configuration
 */
function createProvider(config) {
    // Validate configuration
    if (!config) {
        throw new Error('Provider configuration is required');
    }
    if (!config.provider) {
        throw new Error('Provider type is required in configuration');
    }
    if (!config.model) {
        throw new Error('Model is required in provider configuration');
    }
    if (typeof config.maxTokens !== 'number' || config.maxTokens <= 0) {
        throw new Error('maxTokens must be a positive number');
    }
    if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
        throw new Error('temperature must be a number between 0 and 2');
    }
    const ProviderClass = PROVIDER_REGISTRY.get(config.provider);
    if (!ProviderClass) {
        const availableProviders = Array.from(PROVIDER_REGISTRY.keys()).join(', ');
        console.error(`Failed to create provider: '${config.provider}' not found. Available: ${availableProviders}`);
        throw new Error(`Provider '${config.provider}' is not registered. Available providers: ${availableProviders}`);
    }
    console.info(`Creating ${config.provider} provider with model: ${config.model}`);
    return new ProviderClass(config);
}
/**
 * Create provider from PR analyzer configuration
 */
function createProviderFromConfig(prConfig, providerType) {
    const targetProvider = providerType || prConfig.ai.provider;
    const providerConfig = prConfig.ai.providers[targetProvider];
    if (!providerConfig) {
        throw new Error(`No configuration found for provider '${targetProvider}'`);
    }
    const aiProviderConfig = {
        provider: targetProvider,
        model: providerConfig.model,
        maxTokens: providerConfig.maxTokens,
        temperature: providerConfig.temperature,
        baseUrl: providerConfig.baseUrl,
        timeout: providerConfig.timeout
    };
    return createProvider(aiProviderConfig);
}
/**
 * Get list of available providers
 */
function getAvailableProviders() {
    return Array.from(PROVIDER_REGISTRY.keys());
}
/**
 * Check if a provider is available
 */
function isProviderAvailable(provider) {
    return PROVIDER_REGISTRY.has(provider);
}
/**
 * Validate provider configuration
 */
async function validateProviderConfig(config) {
    try {
        const provider = createProvider(config);
        return await provider.validateConfig();
    }
    catch (error) {
        console.error(`Provider validation failed for ${config.provider}:`, error);
        return false;
    }
}
/**
 * Get default configuration for a provider type
 */
function getDefaultConfig(providerType) {
    return {
        provider: providerType,
        ...constants_1.MODEL_DEFAULTS[providerType]
    };
}
//# sourceMappingURL=factory.js.map