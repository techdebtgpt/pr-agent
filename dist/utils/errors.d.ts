/**
 * Custom error types for PR Agent
 */
/**
 * Configuration-related errors
 */
export declare class ConfigurationError extends Error {
    readonly field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
/**
 * GitHub API-related errors
 */
export declare class GitHubAPIError extends Error {
    readonly statusCode?: number | undefined;
    readonly apiError?: any | undefined;
    constructor(message: string, statusCode?: number | undefined, apiError?: any | undefined);
}
/**
 * Git operation errors
 */
export declare class GitError extends Error {
    readonly command?: string | undefined;
    constructor(message: string, command?: string | undefined);
}
