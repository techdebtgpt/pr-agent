"use strict";
// AI Provider Types
// Common types and interfaces for multi-provider support
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidProviderType = isValidProviderType;
exports.isAnalysisResponse = isAnalysisResponse;
exports.isProviderError = isProviderError;
// Type guards for runtime type checking
function isValidProviderType(value) {
    return ['claude', 'openai', 'gemini'].includes(value);
}
function isAnalysisResponse(value) {
    return (value &&
        typeof value === 'object' &&
        typeof value.summary === 'string' &&
        Array.isArray(value.risks) &&
        typeof value.complexity === 'number' &&
        isValidProviderType(value.provider) &&
        typeof value.model === 'string');
}
function isProviderError(error) {
    return (error &&
        error instanceof Error &&
        'provider' in error &&
        isValidProviderType(error.provider) &&
        'retryable' in error &&
        typeof error.retryable === 'boolean');
}
//# sourceMappingURL=types.js.map