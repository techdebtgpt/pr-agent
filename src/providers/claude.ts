// Claude AI Provider Implementation
// Anthropic Claude integration for PR analysis

import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider } from './base';
import { 
  AIProviderConfig, 
  AnalysisRequest, 
  AnalysisResponse, 
  ModelInfo,
  ProviderCapabilities,
  AIProviderType
} from './types';

export class ClaudeProvider extends BaseAIProvider {
  private anthropic: Anthropic;

  constructor(config: AIProviderConfig) {
    super(config);
    this.anthropic = new Anthropic({
      apiKey: this.apiKey,
      baseURL: config.baseUrl
    });
  }

  getProviderType(): AIProviderType {
    return 'claude';
  }

  protected getApiKeyFromEnv(): string {
    return process.env.ANTHROPIC_API_KEY || '';
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    try {
      // Validate request
      if (!request || !request.diff) {
        throw new Error('Invalid analysis request: diff is required');
      }

      // Check if diff is too large (use copy to avoid mutation)
      let processedDiff = request.diff;
      if (this.isDiffTooLarge(processedDiff)) {
        console.warn('Diff is too large, truncating...');
        processedDiff = this.truncateDiff(processedDiff);
      }

      const analysisRequest = { ...request, diff: processedDiff };
      const prompt = this.buildPrompt(analysisRequest);

      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content
        .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
        .map(block => block.text)
        .join('');

      if (!text) {
        throw new Error('Empty response from Claude');
      }

      const parsed = this.parseResponse(text);

      return {
        ...parsed,
        provider: this.getProviderType(),
        model: this.config.model,
        tokensUsed: response.usage?.input_tokens ? 
          response.usage.input_tokens + (response.usage.output_tokens || 0) : 
          undefined
      };

    } catch (error: any) {
      console.error(`Claude provider error:`, {
        status: error.status,
        message: error.message,
        model: this.config.model
      });

      // Handle Claude-specific errors
      if (error.status === 429) {
        const rateLimitError = new Error(`Claude rate limit exceeded: ${error.message}`);
        (rateLimitError as any).provider = this.getProviderType();
        (rateLimitError as any).retryable = true;
        (rateLimitError as any).rateLimited = true;
        (rateLimitError as any).retryAfter = error.headers?.['retry-after'];
        throw rateLimitError;
      }

      if (error.status === 401) {
        const authError = new Error(`Claude authentication failed: Invalid API key`);
        (authError as any).provider = this.getProviderType();
        (authError as any).retryable = false;
        throw authError;
      }

      if (error.status >= 500) {
        const serverError = new Error(`Claude server error: ${error.message}`);
        (serverError as any).provider = this.getProviderType();
        (serverError as any).retryable = true;
        throw serverError;
      }

      this.handleError(error);
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test with a minimal request
      await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });
      return true;
    } catch (error) {
      console.error('Claude config validation failed:', error);
      return false;
    }
  }

  getModelInfo(): ModelInfo {
    const modelConfigs: Record<string, ModelInfo> = {
      'claude-3-5-sonnet-20241022': {
        name: 'Claude 3.5 Sonnet',
        maxTokens: 200000,
        costPer1kTokens: { input: 0.003, output: 0.015 },
        capabilities: {
          maxContextLength: 200000,
          supportsImages: true,
          supportsStreaming: true,
          supportsFunctionCalling: true,
          rateLimitRpm: 4000,
          rateLimitTpm: 400000
        }
      },
      'claude-3-sonnet-20240229': {
        name: 'Claude 3 Sonnet',
        maxTokens: 200000,
        costPer1kTokens: { input: 0.003, output: 0.015 },
        capabilities: {
          maxContextLength: 200000,
          supportsImages: true,
          supportsStreaming: true,
          supportsFunctionCalling: true,
          rateLimitRpm: 4000,
          rateLimitTpm: 400000
        }
      },
      'claude-3-haiku-20240307': {
        name: 'Claude 3 Haiku',
        maxTokens: 200000,
        costPer1kTokens: { input: 0.00025, output: 0.00125 },
        capabilities: {
          maxContextLength: 200000,
          supportsImages: true,
          supportsStreaming: true,
          supportsFunctionCalling: true,
          rateLimitRpm: 4000,
          rateLimitTpm: 400000
        }
      }
    };

    return modelConfigs[this.config.model] || {
      name: this.config.model,
      maxTokens: 200000,
      capabilities: {
        maxContextLength: 200000,
        supportsImages: false,
        supportsStreaming: true,
        supportsFunctionCalling: false
      }
    };
  }

  getCapabilities(): ProviderCapabilities {
    return this.getModelInfo().capabilities;
  }

  /**
   * Claude-optimized prompt building
   */
  protected buildPrompt(request: AnalysisRequest): string {
    return `
Human: You are an expert software engineer and code reviewer. Your task is to analyze a GitHub pull request (PR) and provide a clear, actionable summary for reviewers.

The following is the diff of the PR that needs reviewing:
${request.diff}
${request.title ? `PR Title: ${request.title}` : ''}
${request.repository ? `Repository: ${request.repository}` : ''}
${request.prNumber ? `PR Number: #${request.prNumber}` : ''}

Analyze the PR and provide a concise, structured response following these guidelines:

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
9. Start directly with the analysis and be detailed.`;
  }
}
