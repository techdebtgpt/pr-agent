/**
 * Custom error types for PR Agent
 */

/**
 * Configuration-related errors
 */
export class ConfigurationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * GitHub API-related errors
 */
export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly apiError?: any,
  ) {
    super(message);
    this.name = 'GitHubAPIError';
    Object.setPrototypeOf(this, GitHubAPIError.prototype);
  }
}

/**
 * Git operation errors
 */
export class GitError extends Error {
  constructor(message: string, public readonly command?: string) {
    super(message);
    this.name = 'GitError';
    Object.setPrototypeOf(this, GitError.prototype);
  }
}

