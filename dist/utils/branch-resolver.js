/**
 * Branch resolution utilities
 * Handles detection of default branch from GitHub API or git commands
 */
import { execSync } from 'child_process';
import { Octokit } from '@octokit/rest';
import { GitHubAPIError, ConfigurationError } from './errors.js';
/**
 * Get repository info from git remote
 */
function getRepoInfo() {
    try {
        const remoteUrl = execSync('git config --get remote.origin.url', {
            encoding: 'utf-8',
        }).trim();
        // Handle both HTTPS and SSH URLs
        // https://github.com/owner/repo.git
        // git@github.com:owner/repo.git
        const match = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/) ||
            remoteUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
        if (match) {
            return {
                owner: match[1],
                name: match[2].replace(/\.git$/, ''),
            };
        }
    }
    catch {
        // Not a git repo or no remote
    }
    return null;
}
/**
 * Get default branch from GitHub API
 */
async function getDefaultBranchFromGitHub(owner, repo, token) {
    if (!token) {
        return null;
    }
    try {
        const octokit = new Octokit({ auth: token });
        const response = await octokit.repos.get({
            owner,
            repo,
        });
        return response.data.default_branch;
    }
    catch (error) {
        if (error.status === 404) {
            throw new GitHubAPIError(`Repository ${owner}/${repo} not found. Check repository name and access permissions.`, 404, error);
        }
        else if (error.status === 401 || error.status === 403) {
            throw new GitHubAPIError(`GitHub API authentication failed. Check your GITHUB_TOKEN.`, error.status, error);
        }
        else {
            throw new GitHubAPIError(`Failed to fetch repository info from GitHub: ${error.message}`, error.status, error);
        }
    }
}
/**
 * Get default branch from git commands
 */
function getDefaultBranchFromGit() {
    try {
        // Try to get default branch from git symbolic-ref
        try {
            const branch = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
                encoding: 'utf-8',
            })
                .trim()
                .replace(/^refs\/remotes\/origin\//, '');
            if (branch) {
                return `origin/${branch}`;
            }
        }
        catch {
            // Fall through to other methods
        }
        // Try common branch names
        const commonBranches = ['origin/main', 'main', 'origin/master', 'master'];
        for (const branch of commonBranches) {
            try {
                execSync(`git rev-parse --verify ${branch}`, { stdio: 'ignore' });
                return branch;
            }
            catch {
                // Continue to next branch
            }
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Resolve the default branch to use for analysis
 */
export async function resolveDefaultBranch(options = {}) {
    const { configBranch, githubToken, repoOwner, repoName, fallbackToGit = true } = options;
    // 1. Use config branch if provided and valid
    if (configBranch && configBranch.trim().length > 0) {
        // Validate the branch name exists
        try {
            execSync(`git rev-parse --verify ${configBranch}`, { stdio: 'ignore' });
            return {
                branch: configBranch,
                source: 'config',
            };
        }
        catch {
            // Config branch doesn't exist, continue to other methods
            if (!fallbackToGit) {
                throw new ConfigurationError(`Configured branch "${configBranch}" not found. Run: pr-agent config --set git.defaultBranch=<branch-name>`, 'git.defaultBranch');
            }
        }
    }
    // 2. Try GitHub API if token and repo info available
    if (githubToken) {
        const repoInfo = repoOwner && repoName ? { owner: repoOwner, name: repoName } : getRepoInfo();
        if (repoInfo) {
            try {
                const defaultBranch = await getDefaultBranchFromGitHub(repoInfo.owner, repoInfo.name, githubToken);
                if (defaultBranch) {
                    const branchRef = `origin/${defaultBranch}`;
                    // Verify branch exists locally
                    try {
                        execSync(`git rev-parse --verify ${branchRef}`, { stdio: 'ignore' });
                        return {
                            branch: branchRef,
                            source: 'github',
                        };
                    }
                    catch {
                        // Branch exists on GitHub but not locally
                        return {
                            branch: branchRef,
                            source: 'github',
                            warning: `Branch ${branchRef} exists on GitHub but not locally. Run: git fetch origin ${defaultBranch}`,
                        };
                    }
                }
            }
            catch (error) {
                // GitHub API failed, but continue to git fallback if enabled
                if (error instanceof GitHubAPIError && fallbackToGit) {
                    // Log warning but continue
                    console.warn(`⚠️  ${error.message}`);
                }
                else {
                    throw error;
                }
            }
        }
    }
    // 3. Fall back to git commands
    if (fallbackToGit) {
        const gitBranch = getDefaultBranchFromGit();
        if (gitBranch) {
            return {
                branch: gitBranch,
                source: 'git',
            };
        }
    }
    // 4. Final fallback to common defaults
    return {
        branch: 'origin/main',
        source: 'fallback',
        warning: 'Could not detect default branch. Using "origin/main" as fallback. Set git.defaultBranch in config to override.',
    };
}
//# sourceMappingURL=branch-resolver.js.map