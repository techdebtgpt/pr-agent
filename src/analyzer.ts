// Multi-Provider AI Analyzer
// Refactored to support multiple AI providers through factory pattern

import { createProvider, createProviderFromConfig } from './providers/factory';
import { AIProviderConfig, AnalysisRequest, AnalysisResponse, AIProviderType } from './providers/types';
import { PRAnalyzerConfig, ExtendedAnalysisResult } from './types';

// Legacy function for backward compatibility
export async function analyzeWithClaude(diff: string, title?: string, apiKey?: string): Promise<string> {
    const config: AIProviderConfig = {
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 1500,
        temperature: 0.2,
        apiKey: apiKey
    };

    try {
        const provider = createProvider(config);
        const request: AnalysisRequest = { diff, title };
        const response = await provider.analyze(request);
        return formatAnalysisResponse(response);
    } catch (error) {
        console.error('Claude analysis failed:', error);
        throw new Error('Sorry, AI analysis is temporarily unavailable.');
    }
}

/**
 * Analyze PR with configurable provider
 */
export async function analyzePR(
    diff: string, 
    title?: string, 
    config?: AIProviderConfig,
    repository?: string,
    prNumber?: number
): Promise<AnalysisResponse> {
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

    const provider = createProvider(config);
    const request: AnalysisRequest = { 
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
export async function analyzePRWithConfig(
    diff: string,
    title?: string,
    prConfig?: PRAnalyzerConfig,
    repository?: string,
    prNumber?: number,
    fallbackProviders?: AIProviderType[]
): Promise<ExtendedAnalysisResult> {
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

    let lastError: Error | null = null;
    const failedProviders: string[] = [];

    for (const providerType of uniqueProviders) {
        try {
            console.info(`Attempting analysis with provider: ${providerType}`);
            const provider = createProviderFromConfig(prConfig, providerType);
            const request: AnalysisRequest = { 
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
        } catch (error) {
            failedProviders.push(providerType);
            console.warn(`Provider ${providerType} failed:`, error);
            lastError = error as Error;
            continue;
        }
    }

    throw new Error(`All providers failed (${failedProviders.join(', ')}). Last error: ${lastError?.message}`);
}

/**
 * Format analysis response for backward compatibility
 */
function formatAnalysisResponse(response: AnalysisResponse): string {
    let formatted = `### Summary\n${response.summary}\n\n`;
    
    if (response.risks.length > 0) {
        formatted += `### Potential Risks\n`;
        response.risks.forEach(risk => {
            formatted += `- ${risk}\n`;
        });
        formatted += '\n';
    } else {
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
export { getAvailableProviders, isProviderAvailable } from './providers/factory';
