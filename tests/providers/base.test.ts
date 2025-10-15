// Base Provider Tests
import { BaseAIProvider } from '../../src/providers/base';
import { 
  AIProviderConfig, 
  AnalysisRequest, 
  AnalysisResponse, 
  ModelInfo,
  ProviderCapabilities,
  AIProviderType
} from '../../src/providers/types';

// Mock implementation for testing
class MockProvider extends BaseAIProvider {
  getProviderType(): AIProviderType {
    return 'claude';
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    const parsed = this.parseResponse('**Summary**: Test summary\n\n**Potential Risks**:\n- Risk 1\n- Risk 2\n\n**Complexity**: 3/5');
    return {
      ...parsed,
      provider: 'claude',
      model: this.config.model
    };
  }

  async validateConfig(): Promise<boolean> {
    return true;
  }

  getModelInfo(): ModelInfo {
    return {
      name: 'Test Model',
      maxTokens: 100000,
      capabilities: this.getCapabilities()
    };
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxContextLength: 100000,
      supportsImages: false,
      supportsStreaming: false,
      supportsFunctionCalling: false
    };
  }

  protected getApiKeyFromEnv(): string {
    return process.env.TEST_API_KEY || '';
  }

  // Expose protected methods for testing
  public testBuildPrompt(request: AnalysisRequest): string {
    return this.buildPrompt(request);
  }

  public testParseResponse(response: string) {
    return this.parseResponse(response);
  }

  public testIsDiffTooLarge(diff: string): boolean {
    return this.isDiffTooLarge(diff);
  }

  public testTruncateDiff(diff: string): string {
    return this.truncateDiff(diff);
  }
}

describe('BaseAIProvider', () => {
  const validConfig: AIProviderConfig = {
    provider: 'claude',
    model: 'test-model',
    maxTokens: 1500,
    temperature: 0.2,
    apiKey: 'test-api-key-1234567890'
  };

  describe('Constructor', () => {
    it('should create provider with valid config', () => {
      const provider = new MockProvider(validConfig);
      expect(provider).toBeDefined();
    });

    it('should throw error for missing API key', () => {
      const config = { ...validConfig, apiKey: undefined };
      expect(() => new MockProvider(config)).toThrow('API key is required');
    });

    it('should throw error for short API key', () => {
      const config = { ...validConfig, apiKey: 'short' };
      expect(() => new MockProvider(config)).toThrow('Invalid API key format');
    });
  });

  describe('buildPrompt', () => {
    it('should build prompt with all fields', () => {
      const provider = new MockProvider(validConfig);
      const request: AnalysisRequest = {
        diff: 'test diff',
        title: 'Test PR',
        repository: 'test/repo',
        prNumber: 123
      };

      const prompt = provider.testBuildPrompt(request);
      expect(prompt).toContain('test diff');
      expect(prompt).toContain('Test PR');
      expect(prompt).toContain('test/repo');
      expect(prompt).toContain('#123');
    });

    it('should throw error for empty diff', () => {
      const provider = new MockProvider(validConfig);
      const request: AnalysisRequest = { diff: '' };
      
      expect(() => provider.testBuildPrompt(request)).toThrow('Diff is required and cannot be empty');
    });

    it('should throw error for very large diff', () => {
      const provider = new MockProvider(validConfig);
      const largeDiff = 'x'.repeat(2000000); // 2MB
      const request: AnalysisRequest = { diff: largeDiff };
      
      expect(() => provider.testBuildPrompt(request)).toThrow('Diff is too large');
    });
  });

  describe('parseResponse', () => {
    it('should parse valid response', () => {
      const provider = new MockProvider(validConfig);
      const response = `
**Summary**: This PR adds new features

**Potential Risks**:
- Risk 1
- Risk 2

**Complexity**: 4/5
      `;

      const parsed = provider.testParseResponse(response);
      expect(parsed.summary).toContain('This PR adds new features');
      expect(parsed.risks).toHaveLength(2);
      expect(parsed.complexity).toBe(4);
    });

    it('should handle "None" risks', () => {
      const provider = new MockProvider(validConfig);
      const response = `
**Summary**: Test

**Potential Risks**: None

**Complexity**: 2/5
      `;

      const parsed = provider.testParseResponse(response);
      expect(parsed.risks).toHaveLength(0);
    });

    it('should default to complexity 3 if not found', () => {
      const provider = new MockProvider(validConfig);
      const response = '**Summary**: Test summary';

      const parsed = provider.testParseResponse(response);
      expect(parsed.complexity).toBe(3);
    });

    it('should clamp complexity to 1-5 range', () => {
      const provider = new MockProvider(validConfig);
      const response1 = '**Complexity**: 0/5';
      const response2 = '**Complexity**: 10/5';

      const parsed1 = provider.testParseResponse(response1);
      const parsed2 = provider.testParseResponse(response2);

      expect(parsed1.complexity).toBe(1);
      expect(parsed2.complexity).toBe(5);
    });
  });

  describe('isDiffTooLarge', () => {
    it('should return false for small diff', () => {
      const provider = new MockProvider(validConfig);
      const smallDiff = 'x'.repeat(1000);
      
      expect(provider.testIsDiffTooLarge(smallDiff)).toBe(false);
    });

    it('should return true for very large diff', () => {
      const provider = new MockProvider(validConfig);
      // Create diff that's > 80% of context window
      const largeDiff = 'x'.repeat(400000); // ~100k tokens
      
      expect(provider.testIsDiffTooLarge(largeDiff)).toBe(true);
    });
  });

  describe('truncateDiff', () => {
    it('should not truncate small diff', () => {
      const provider = new MockProvider(validConfig);
      const smallDiff = 'small diff';
      
      const truncated = provider.testTruncateDiff(smallDiff);
      expect(truncated).toBe(smallDiff);
    });

    it('should truncate large diff', () => {
      const provider = new MockProvider(validConfig);
      const largeDiff = 'x'.repeat(500000);
      
      const truncated = provider.testTruncateDiff(largeDiff);
      expect(truncated.length).toBeLessThan(largeDiff.length);
      expect(truncated).toContain('[... diff truncated due to size limits ...]');
    });
  });
});

