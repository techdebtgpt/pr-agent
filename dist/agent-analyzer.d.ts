import { AIProviderConfig, AnalysisResponse } from './providers/types';
/**
 * Agent-based analysis for large PRs
 * Splits the PR into chunks and analyzes them separately, then aggregates results
 */
export declare function analyzeLargePR(diff: string, title: string | undefined, config: AIProviderConfig, repository?: string, prNumber?: number): Promise<AnalysisResponse>;
