/**
 * Helper functions for file analysis tools
 */
import type { DiffFile, AgentState } from '../pr-agent';
import type { AnalysisResponse } from '../providers/types';
export declare function prepareFileContent(file: DiffFile, getFileContent: (filePath: string, ref?: string) => string | null, getDeletedFileContent: (filePath: string, ref?: string) => string | null): {
    fileContent: string;
    analysisContext: string;
};
export declare function extractRisksAndComplexity(rawResponse: string, analysis: AnalysisResponse, state: AgentState): void;
export declare function checkImportsForFile(file: DiffFile, githubApi: any, repository: {
    owner: string;
    repo: string;
    baseSha?: string;
    headSha?: string;
} | undefined, state: AgentState): Promise<{
    importFindings: any[];
    risksFromImports: string[];
}>;
