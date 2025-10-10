export interface PRInfo {
    number: number;
    title: string;
    diff: string;
    author: string;
    repository: string;
}
export interface AnalysisResult {
    summary: string;
    risks: string[];
    complexity: number;
}
