export declare const PROVIDER_CONSTANTS: {
    readonly CHARS_PER_TOKEN: 4;
    readonly CONTEXT_USAGE_RATIO: 0.8;
    readonly MAX_DIFF_SIZE_BYTES: 1000000;
    readonly MIN_API_KEY_LENGTH: 10;
    readonly MAX_VALIDATION_TOKENS: 10;
    readonly MIN_DIFF_LENGTH: 1;
    readonly DEFAULT_TIMEOUT: 30000;
    readonly VALIDATION_TIMEOUT: 10000;
    readonly MAX_RETRIES: 3;
    readonly RETRY_DELAY_MS: 1000;
    readonly EXPONENTIAL_BACKOFF_FACTOR: 2;
};
export declare const MODEL_DEFAULTS: {
    readonly claude: {
        readonly model: "claude-3-5-sonnet-20241022";
        readonly maxTokens: 1500;
        readonly temperature: 0.2;
    };
    readonly openai: {
        readonly model: "gpt-4-turbo";
        readonly maxTokens: 1500;
        readonly temperature: 0.2;
    };
    readonly gemini: {
        readonly model: "gemini-pro";
        readonly maxTokens: 1500;
        readonly temperature: 0.2;
    };
};
