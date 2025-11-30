/**
 * Custom error types for PR Agent
 */
/**
 * Configuration-related errors
 */
export class ConfigurationError extends Error {
    field;
    constructor(message, field) {
        super(message);
        this.field = field;
        this.name = 'ConfigurationError';
        Object.setPrototypeOf(this, ConfigurationError.prototype);
    }
}
/**
 * GitHub API-related errors
 */
export class GitHubAPIError extends Error {
    statusCode;
    apiError;
    constructor(message, statusCode, apiError) {
        super(message);
        this.statusCode = statusCode;
        this.apiError = apiError;
        this.name = 'GitHubAPIError';
        Object.setPrototypeOf(this, GitHubAPIError.prototype);
    }
}
/**
 * Git operation errors
 */
export class GitError extends Error {
    command;
    constructor(message, command) {
        super(message);
        this.command = command;
        this.name = 'GitError';
        Object.setPrototypeOf(this, GitError.prototype);
    }
}
//# sourceMappingURL=errors.js.map