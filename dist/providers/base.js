"use strict";
// Base AI Provider Interface
// Abstract base class that all AI providers must implement
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAIProvider = void 0;
const constants_1 = require("./constants");
class BaseAIProvider {
    config;
    apiKey;
    promptCache = new Map();
    constructor(config) {
        this.config = config;
        this.apiKey = config.apiKey || this.getApiKeyFromEnv();
        if (!this.apiKey) {
            throw new Error(`API key is required for ${config.provider} provider`);
        }
        // Validate API key format (basic check)
        if (this.apiKey.length < constants_1.PROVIDER_CONSTANTS.MIN_API_KEY_LENGTH) {
            throw new Error(`Invalid API key format for ${config.provider} provider`);
        }
    }
    /**
     * Build the analysis prompt for this provider
     * Can be overridden by providers to optimize for their specific format
     */
    buildPrompt(request) {
        // Input validation
        if (!request.diff || request.diff.trim().length === 0) {
            throw new Error('Diff is required and cannot be empty');
        }
        if (request.diff.length > constants_1.PROVIDER_CONSTANTS.MAX_DIFF_SIZE_BYTES) {
            throw new Error(`Diff is too large (>${constants_1.PROVIDER_CONSTANTS.MAX_DIFF_SIZE_BYTES / 1000000}MB)`);
        }
        return `
[ROLE] You are an expert software engineer and code reviewer. Your task is to analyze a GitHub pull request (PR) and provide a clear, actionable summary for reviewers.

[CONTEXT] 
The following is the diff of the PR that needs reviewing:
${request.diff}
${request.title ? `PR Title: ${request.title}` : ''}
${request.repository ? `Repository: ${request.repository}` : ''}
${request.prNumber ? `PR Number: #${request.prNumber}` : ''}

[TASK] Analyze the PR and provide a concise, structured response following the guidelines below.

[GUIDELINES]
1. Provide a **Summary**: briefly describe what the change does and its purpose.
2. Identify **Potential Risks**: list possible bugs, edge cases, or issues. Write "None" if no risks are apparent.
3. Rate **Complexity (1–5)**:
   - 1 = trivial (small, safe, no risk)  
   - 3 = moderate (requires some attention, medium risk)  
   - 5 = very complex (large change, high risk, needs deep review)
4. Keep the response under 200 words.
5. Focus on clarity and actionable insights relevant for reviewers.
6. Reference specific files or sections in the diff if needed.
7. Use Markdown for formatting.
8. Do not include generic introductions like "Let's analyze this PR".
9. Start directly with the analysis and be detailed.
    `.trim();
    }
    /**
     * Parse the AI response into structured format
     * Can be overridden by providers if they need custom parsing
     */
    parseResponse(response) {
        // Default parsing logic - extract summary, risks, and complexity
        const summaryMatch = response.match(/\*\*Summary\*\*:?\s*(.*?)(?=\*\*|$)/is);
        const risksMatch = response.match(/\*\*Potential Risks\*\*:?\s*(.*?)(?=\*\*|$)/is);
        const complexityMatch = response.match(/\*\*Complexity.*?(\d+)/i);
        const summary = summaryMatch?.[1]?.trim() || response.substring(0, 200);
        // Parse risks - look for bullet points or numbered lists
        const risksText = risksMatch?.[1]?.trim() || '';
        const risks = risksText.toLowerCase().includes('none') ? [] :
            risksText.split(/\n\s*[-•*]\s+|\n\s*\d+\.\s+/)
                .filter(risk => risk.trim().length > 0)
                .map(risk => risk.trim().replace(/^[-•*]\s+|\d+\.\s+/, ''));
        const complexity = complexityMatch ? parseInt(complexityMatch[1]) : 3;
        return {
            summary,
            risks,
            complexity: Math.max(1, Math.min(5, complexity)) // Ensure 1-5 range
        };
    }
    /**
     * Handle provider-specific errors
     */
    handleError(error) {
        const providerError = new Error(`${this.getProviderType()} provider error: ${error.message}`);
        providerError.provider = this.getProviderType();
        providerError.originalError = error;
        throw providerError;
    }
    /**
     * Check if the diff is too large for the provider's context window
     */
    isDiffTooLarge(diff) {
        const capabilities = this.getCapabilities();
        const estimatedTokens = Math.ceil(diff.length / constants_1.PROVIDER_CONSTANTS.CHARS_PER_TOKEN);
        return estimatedTokens > (capabilities.maxContextLength * constants_1.PROVIDER_CONSTANTS.CONTEXT_USAGE_RATIO);
    }
    /**
     * Truncate diff if it's too large
     */
    truncateDiff(diff) {
        const capabilities = this.getCapabilities();
        const maxChars = Math.floor(capabilities.maxContextLength *
            constants_1.PROVIDER_CONSTANTS.CONTEXT_USAGE_RATIO *
            constants_1.PROVIDER_CONSTANTS.CHARS_PER_TOKEN);
        if (diff.length <= maxChars) {
            return diff;
        }
        const truncated = diff.substring(0, maxChars);
        return truncated + '\n\n[... diff truncated due to size limits ...]';
    }
    /**
     * Clear prompt cache (useful for testing)
     */
    clearPromptCache() {
        this.promptCache.clear();
    }
    /**
     * Get cache size (useful for monitoring)
     */
    getPromptCacheSize() {
        return this.promptCache.size;
    }
}
exports.BaseAIProvider = BaseAIProvider;
//# sourceMappingURL=base.js.map