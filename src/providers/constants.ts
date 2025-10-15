// Provider Constants
// Centralized constants for AI providers

export const PROVIDER_CONSTANTS = {
  // Token estimation (rough approximation: 1 token ≈ 4 characters)
  CHARS_PER_TOKEN: 4,
  
  // Context window usage (use 80% to leave room for response)
  CONTEXT_USAGE_RATIO: 0.8,
  
  // Diff size limits
  MAX_DIFF_SIZE_BYTES: 1000000, // 1MB
  MIN_API_KEY_LENGTH: 10,
  
  // Validation limits
  MAX_VALIDATION_TOKENS: 10,
  MIN_DIFF_LENGTH: 1,
  
  // Default timeouts (in milliseconds)
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  VALIDATION_TIMEOUT: 10000, // 10 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  EXPONENTIAL_BACKOFF_FACTOR: 2
} as const;

export const MODEL_DEFAULTS = {
  claude: {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 1500,
    temperature: 0.2
  },
  openai: {
    model: 'gpt-4-turbo',
    maxTokens: 1500,
    temperature: 0.2
  },
  gemini: {
    model: 'gemini-pro',
    maxTokens: 1500,
    temperature: 0.2
  }
} as const;
