"use strict";
// Multi-Provider AI Analyzer
// Refactored to support multiple AI providers through factory pattern
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProviderAvailable = exports.getAvailableProviders = void 0;
exports.analyzeWithClaude = analyzeWithClaude;
exports.analyzePR = analyzePR;
exports.analyzePRWithConfig = analyzePRWithConfig;
const factory_1 = require("./providers/factory");
// Legacy function for backward compatibility
async function analyzeWithClaude(diff, title, apiKey) {
    const config = {
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 1500,
        temperature: 0.2,
        apiKey: apiKey
    };
    try {
        const provider = (0, factory_1.createProvider)(config);
        const request = { diff, title };
        const response = await provider.analyze(request);
        return formatAnalysisResponse(response);
    }
    catch (error) {
        console.error('Claude analysis failed:', error);
        return 'Sorry, AI analysis is temporarily unavailable.';
    }
}
/**
 * Analyze PR with configurable provider
 */
async function analyzePR(diff, title, config, repository, prNumber) {
    // Validate input
    if (!diff || typeof diff !== 'string') {
        throw new Error('Diff must be a non-empty string');
    }
    if (!config) {
        // Default to Claude if no config provided
        config = {
            provider: 'claude',
            model: 'claude-3-5-sonnet-20241022',
            maxTokens: 1500,
            temperature: 0.2
        };
    }
    const provider = (0, factory_1.createProvider)(config);
    const request = {
        diff,
        title,
        repository,
        prNumber
    };
    return await provider.analyze(request);
}
/**
 * Analyze PR using configuration file
 */
async function analyzePRWithConfig(diff, title, prConfig, repository, prNumber, fallbackProviders) {
    // Validate input
    if (!diff || typeof diff !== 'string') {
        throw new Error('Diff must be a non-empty string');
    }
    if (!prConfig) {
        // Use default configuration
        const response = await analyzePR(diff, title, undefined, repository, prNumber);
        return {
            ...response,
            provider: response.provider,
            model: response.model
        };
    }
    const providersToTry = [
        prConfig.ai.provider,
        ...(fallbackProviders || prConfig.ai.fallbackProviders || [])
    ];
    // Remove duplicates
    const uniqueProviders = Array.from(new Set(providersToTry));
    if (uniqueProviders.length === 0) {
        throw new Error('No providers configured');
    }
    let lastError = null;
    const failedProviders = [];
    for (const providerType of uniqueProviders) {
        try {
            console.info(`Attempting analysis with provider: ${providerType}`);
            const provider = (0, factory_1.createProviderFromConfig)(prConfig, providerType);
            const request = {
                diff,
                title,
                repository,
                prNumber
            };
            const response = await provider.analyze(request);
            console.info(`Successfully analyzed with ${providerType}`);
            return {
                ...response,
                provider: response.provider,
                model: response.model,
                tokensUsed: response.tokensUsed,
                recommendations: response.recommendations
            };
        }
        catch (error) {
            failedProviders.push(providerType);
            console.warn(`Provider ${providerType} failed:`, error);
            lastError = error;
            continue;
        }
    }
    throw new Error(`All providers failed (${failedProviders.join(', ')}). Last error: ${lastError?.message}`);
}
/**
 * Format analysis response for backward compatibility
 */
function formatAnalysisResponse(response) {
    let formatted = `### Summary\n${response.summary}\n\n`;
    if (response.risks.length > 0) {
        formatted += `### Potential Risks\n`;
        response.risks.forEach(risk => {
            formatted += `- ${risk}\n`;
        });
        formatted += '\n';
    }
    else {
        formatted += `### Potential Risks\nNone\n\n`;
    }
    formatted += `### Complexity: ${response.complexity}/5\n`;
    if (response.recommendations && response.recommendations.length > 0) {
        formatted += `\n### Recommendations\n`;
        response.recommendations.forEach(rec => {
            formatted += `- ${rec}\n`;
        });
    }
    return formatted;
}
/**
 * Get available providers
 */
var factory_2 = require("./providers/factory");
Object.defineProperty(exports, "getAvailableProviders", { enumerable: true, get: function () { return factory_2.getAvailableProviders; } });
Object.defineProperty(exports, "isProviderAvailable", { enumerable: true, get: function () { return factory_2.isProviderAvailable; } });
//# sourceMappingURL=analyzer.js.map