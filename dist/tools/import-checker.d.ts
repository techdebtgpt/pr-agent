/**
 * Import checker utility - checks imports and usages using GitHub API
 */
import type { DiffFile } from '../pr-agent';
export declare function checkImportsAndUsages(file: DiffFile, githubApi: any, repository: {
    owner: string;
    repo: string;
    baseSha?: string;
    headSha?: string;
}): Promise<{
    success: boolean;
    error?: string;
    findings: any[];
}>;
