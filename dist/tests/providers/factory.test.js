"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const factory_1 = require("../../src/providers/factory");
describe('Provider Factory', () => {
    describe('createProvider', () => {
        it('should create Claude provider with valid config', () => {
            const config = {
                provider: 'claude',
                model: 'claude-3-5-sonnet-20241022',
                maxTokens: 1500,
                temperature: 0.2,
                apiKey: 'test-api-key-1234567890'
            };
            const provider = (0, factory_1.createProvider)(config);
            expect(provider).toBeDefined();
            expect(provider.getProviderType()).toBe('claude');
        });
        it('should throw error for missing config', () => {
            expect(() => (0, factory_1.createProvider)(null)).toThrow('Provider configuration is required');
        });
        it('should throw error for missing provider type', () => {
            const config = {
                model: 'test',
                maxTokens: 1500,
                temperature: 0.2
            };
            expect(() => (0, factory_1.createProvider)(config)).toThrow('Provider type is required');
        });
        it('should throw error for missing model', () => {
            const config = {
                provider: 'claude',
                maxTokens: 1500,
                temperature: 0.2
            };
            expect(() => (0, factory_1.createProvider)(config)).toThrow('Model is required');
        });
        it('should throw error for invalid maxTokens', () => {
            const config = {
                provider: 'claude',
                model: 'test',
                maxTokens: -1,
                temperature: 0.2
            };
            expect(() => (0, factory_1.createProvider)(config)).toThrow('maxTokens must be a positive number');
        });
        it('should throw error for invalid temperature', () => {
            const config = {
                provider: 'claude',
                model: 'test',
                maxTokens: 1500,
                temperature: 3,
                apiKey: 'test-key-123'
            };
            expect(() => (0, factory_1.createProvider)(config)).toThrow('temperature must be a number between 0 and 2');
        });
        it('should throw error for unregistered provider', () => {
            const config = {
                provider: 'openai',
                model: 'gpt-4',
                maxTokens: 1500,
                temperature: 0.2,
                apiKey: 'test-key'
            };
            expect(() => (0, factory_1.createProvider)(config)).toThrow('not registered');
        });
    });
    describe('getAvailableProviders', () => {
        it('should return array of available providers', () => {
            const providers = (0, factory_1.getAvailableProviders)();
            expect(Array.isArray(providers)).toBe(true);
            expect(providers).toContain('claude');
        });
    });
    describe('isProviderAvailable', () => {
        it('should return true for Claude', () => {
            expect((0, factory_1.isProviderAvailable)('claude')).toBe(true);
        });
        it('should return false for unregistered providers', () => {
            expect((0, factory_1.isProviderAvailable)('openai')).toBe(false);
            expect((0, factory_1.isProviderAvailable)('gemini')).toBe(false);
        });
    });
    describe('getDefaultConfig', () => {
        it('should return default config for Claude', () => {
            const config = (0, factory_1.getDefaultConfig)('claude');
            expect(config.provider).toBe('claude');
            expect(config.model).toBe('claude-3-5-sonnet-20241022');
            expect(config.maxTokens).toBe(1500);
            expect(config.temperature).toBe(0.2);
        });
        it('should return default config for OpenAI', () => {
            const config = (0, factory_1.getDefaultConfig)('openai');
            expect(config.provider).toBe('openai');
            expect(config.model).toBe('gpt-4-turbo');
        });
        it('should return default config for Gemini', () => {
            const config = (0, factory_1.getDefaultConfig)('gemini');
            expect(config.provider).toBe('gemini');
            expect(config.model).toBe('gemini-pro');
        });
    });
});
//# sourceMappingURL=factory.test.js.map