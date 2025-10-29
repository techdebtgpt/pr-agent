// Analyzer Tests
import { analyzePR } from '../src/analyzer';
import { AnalysisResponse } from '../src/providers/types';

// Mock the provider factory
jest.mock('../src/providers/factory', () => ({
  createProvider: jest.fn(() => ({
    analyze: jest.fn().mockResolvedValue({
      summary: 'Test summary',
      risks: ['Risk 1', 'Risk 2'],
      complexity: 3,
      provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
      tokensUsed: 100
    })
  }))
}));

describe('Analyzer', () => {
  describe('analyzePR', () => {
    it('should analyze PR with valid diff', async () => {
      const result = await analyzePR('test diff', 'Test PR');
      
      expect(result).toBeDefined();
      expect(result.summary).toBe('Test summary');
      expect(result.risks).toHaveLength(2);
      expect(result.complexity).toBe(3);
      expect(result.provider).toBe('claude');
    });

    it('should throw error for empty diff', async () => {
      await expect(analyzePR('')).rejects.toThrow('Diff must be a non-empty string');
    });

    it('should throw error for null diff', async () => {
      await expect(analyzePR(null as any)).rejects.toThrow('Diff must be a non-empty string');
    });

    it('should throw error for non-string diff', async () => {
      await expect(analyzePR(123 as any)).rejects.toThrow('Diff must be a non-empty string');
    });

    it('should use default config when none provided', async () => {
      const result = await analyzePR('test diff');
      expect(result).toBeDefined();
    });

    it('should accept repository and prNumber', async () => {
      const result = await analyzePR('test diff', 'Test PR', undefined, 'test/repo', 123);
      expect(result).toBeDefined();
    });
  });
});

