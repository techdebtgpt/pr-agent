// Type Guards Tests
import { isValidProviderType, isAnalysisResponse, isProviderError } from '../../src/providers/types';

describe('Type Guards', () => {
  describe('isValidProviderType', () => {
    it('should validate correct provider types', () => {
      expect(isValidProviderType('claude')).toBe(true);
      expect(isValidProviderType('openai')).toBe(true);
      expect(isValidProviderType('gemini')).toBe(true);
    });

    it('should reject invalid provider types', () => {
      expect(isValidProviderType('invalid')).toBe(false);
      expect(isValidProviderType('')).toBe(false);
      expect(isValidProviderType(null)).toBe(false);
      expect(isValidProviderType(undefined)).toBe(false);
      expect(isValidProviderType(123)).toBe(false);
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
      expect(isAnalysisResponse(validResponse)).toBe(true);
    });

    it('should reject invalid analysis responses', () => {
      expect(isAnalysisResponse(null)).toBe(false);
      expect(isAnalysisResponse(undefined)).toBe(false);
      expect(isAnalysisResponse({})).toBe(false);
      expect(isAnalysisResponse({ summary: 'test' })).toBe(false);
      expect(isAnalysisResponse({ 
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
      (error as any).provider = 'claude';
      (error as any).retryable = true;
      expect(isProviderError(error)).toBe(true);
    });

    it('should reject invalid provider errors', () => {
      expect(isProviderError(null)).toBe(false);
      expect(isProviderError(new Error('test'))).toBe(false);
      expect(isProviderError({ message: 'test' })).toBe(false);
    });
  });
});

