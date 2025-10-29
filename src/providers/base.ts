// Base AI Provider Interface
// Abstract base class that all AI providers must implement

import { 
  AIProviderConfig, 
  AnalysisRequest, 
  AnalysisResponse, 
  ModelInfo,
  ProviderCapabilities,
  AIProviderType
} from './types';
import { PROVIDER_CONSTANTS } from './constants';

export abstract class BaseAIProvider {
  protected config: AIProviderConfig;
  protected apiKey: string;
  private promptCache: Map<string, string> = new Map();

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.apiKey = config.apiKey || this.getApiKeyFromEnv();
    
    if (!this.apiKey) {
      throw new Error(`API key is required for ${config.provider} provider`);
    }
    
    // Validate API key format (basic check)
    if (this.apiKey.length < PROVIDER_CONSTANTS.MIN_API_KEY_LENGTH) {
      throw new Error(`Invalid API key format for ${config.provider} provider`);
    }
  }

  /**
   * Get the provider type
   */
  abstract getProviderType(): AIProviderType;

  /**
   * Analyze a pull request diff and return structured insights
   */
  abstract analyze(request: AnalysisRequest): Promise<AnalysisResponse>;

  /**
   * Validate the provider configuration
   */
  abstract validateConfig(): Promise<boolean>;

  /**
   * Get information about the configured model
   */
  abstract getModelInfo(): ModelInfo;

  /**
   * Get provider capabilities
   */
  abstract getCapabilities(): ProviderCapabilities;

  /**
   * Get the API key from environment variables
   * Each provider should override this to specify their env var name
   */
  protected abstract getApiKeyFromEnv(): string;

  /**
   * Build the analysis prompt for this provider
   * Can be overridden by providers to optimize for their specific format
   */
  protected buildPrompt(request: AnalysisRequest): string {
    // Input validation
    if (!request.diff || request.diff.trim().length === 0) {
      throw new Error('Diff is required and cannot be empty');
    }
    
    if (request.diff.length > PROVIDER_CONSTANTS.MAX_DIFF_SIZE_BYTES) {
      throw new Error(`Diff is too large (>${PROVIDER_CONSTANTS.MAX_DIFF_SIZE_BYTES / 1000000}MB)`);
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
  protected parseResponse(response: string): Omit<AnalysisResponse, 'provider' | 'model'> {
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
  protected handleError(error: any): never {
    const providerError = new Error(`${this.getProviderType()} provider error: ${error.message}`);
    (providerError as any).provider = this.getProviderType();
    (providerError as any).originalError = error;
    throw providerError;
  }

  /**
   * Check if the diff is too large for the provider's context window
   */
  protected isDiffTooLarge(diff: string): boolean {
    const capabilities = this.getCapabilities();
    const estimatedTokens = Math.ceil(diff.length / PROVIDER_CONSTANTS.CHARS_PER_TOKEN);
    return estimatedTokens > (capabilities.maxContextLength * PROVIDER_CONSTANTS.CONTEXT_USAGE_RATIO);
  }

  /**
   * Truncate diff if it's too large
   */
  protected truncateDiff(diff: string): string {
    const capabilities = this.getCapabilities();
    const maxChars = Math.floor(
      capabilities.maxContextLength * 
      PROVIDER_CONSTANTS.CONTEXT_USAGE_RATIO * 
      PROVIDER_CONSTANTS.CHARS_PER_TOKEN
    );
    
    if (diff.length <= maxChars) {
      return diff;
    }

    const truncated = diff.substring(0, maxChars);
    return truncated + '\n\n[... diff truncated due to size limits ...]';
  }

  /**
   * Clear prompt cache (useful for testing)
   */
  protected clearPromptCache(): void {
    this.promptCache.clear();
  }

  /**
   * Get cache size (useful for monitoring)
   */
  protected getPromptCacheSize(): number {
    return this.promptCache.size;
  }
}
