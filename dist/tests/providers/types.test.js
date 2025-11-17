"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../src/providers/types");
describe('Type Guards', () => {
    describe('isValidProviderType', () => {
        it('should validate correct provider types', () => {
            expect((0, types_1.isValidProviderType)('claude')).toBe(true);
            expect((0, types_1.isValidProviderType)('openai')).toBe(true);
            expect((0, types_1.isValidProviderType)('gemini')).toBe(true);
        });
        it('should reject invalid provider types', () => {
            expect((0, types_1.isValidProviderType)('invalid')).toBe(false);
            expect((0, types_1.isValidProviderType)('')).toBe(false);
            expect((0, types_1.isValidProviderType)(null)).toBe(false);
            expect((0, types_1.isValidProviderType)(undefined)).toBe(false);
            expect((0, types_1.isValidProviderType)(123)).toBe(false);
        });
    });
    describe('isAnalysisResponse', () => {
        it('should validate correct analysis response', () => {
            const validResponse = {
                summary: 'Test summary',
                risks: ['risk1', 'risk2'],
                complexity: 3,
                provider: 'claude',
                model: 'claude-3-5-sonnet-20241022',
                tokensUsed: 100
            };
            expect((0, types_1.isAnalysisResponse)(validResponse)).toBe(true);
        });
        it('should reject invalid analysis responses', () => {
            expect((0, types_1.isAnalysisResponse)(null)).toBe(false);
            expect((0, types_1.isAnalysisResponse)(undefined)).toBe(false);
            expect((0, types_1.isAnalysisResponse)({})).toBe(false);
            expect((0, types_1.isAnalysisResponse)({ summary: 'test' })).toBe(false);
            expect((0, types_1.isAnalysisResponse)({
                summary: 'test',
                risks: 'not-array',
                complexity: 1,
                provider: 'claude',
                model: 'test'
            })).toBe(false);
        });
    });
    describe('isProviderError', () => {
        it('should validate correct provider errors', () => {
            const error = new Error('test');
            error.provider = 'claude';
            error.retryable = true;
            expect((0, types_1.isProviderError)(error)).toBe(true);
        });
        it('should reject invalid provider errors', () => {
            expect((0, types_1.isProviderError)(null)).toBe(false);
            expect((0, types_1.isProviderError)(new Error('test'))).toBe(false);
            expect((0, types_1.isProviderError)({ message: 'test' })).toBe(false);
        });
    });
});
//# sourceMappingURL=types.test.js.map