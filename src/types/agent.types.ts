/**
 * Agent types and interfaces for PR Agent
 * Following architecture-doc-generator patterns
 */

export interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  diff: string;
  language?: string;
  status?: 'A' | 'M' | 'D' | 'R'; // Added, Modified, Deleted, Renamed
  oldPath?: string;
}

export interface ArchDocsContext {
  available: boolean;
  summary: string;
  relevantDocs: Array<{
    filename: string;
    title: string;
    section: string;
    content: string;
    relevance: number;
  }>;
  totalDocs: number;
}

export interface AgentContext {
  diff: string;
  title?: string;
  files: DiffFile[];
  repository?: string;
  prNumber?: number;
  tokenBudget: number;
  maxCost: number;
  mode: AnalysisMode;
  config?: Record<string, unknown>;
  archDocs?: ArchDocsContext; // Architecture documentation context
  language?: string;
  framework?: string;
  enableStaticAnalysis?: boolean;
}

export interface AnalysisMode {
  summary: boolean;
  risks: boolean;
  complexity: boolean;
}

export interface RiskItem {
  description: string;
  archDocsReference?: {
    source: string; // Which arch-doc (e.g., 'security.md', 'patterns.md')
    excerpt: string; // Relevant excerpt from arch-docs
    reason: string; // Why this is a risk based on arch-docs
  };
}

export interface FileAnalysis {
  path: string;
  summary: string;
  risks: string[] | RiskItem[];
  complexity: number;
  changes: {
    additions: number;
    deletions: number;
  };
  recommendations: string[];
}

export interface Fix {
  file: string;
  line?: number;
  comment: string;
  severity?: 'critical' | 'warning' | 'suggestion';
  source?: 'semgrep' | 'ai'; // Track where the fix came from
}

export interface AgentResult {
  summary: string;
  fileAnalyses: Map<string, FileAnalysis>;
  fixes: Fix[];
  recommendations: string[];
  insights: string[];
  reasoning: string[];
  provider: string;
  model: string;
  totalTokensUsed: number;
  executionTime: number;
  mode: AnalysisMode;
  archDocsImpact?: {
    used: boolean;
    docsAvailable: number;
    sectionsUsed: number;
    influencedStages: string[];
    keyInsights: string[];
  };
  staticAnalysis?: {
    enabled: boolean;
    totalFindings: number;
    errorCount: number;
    warningCount: number;
    criticalIssues: string[];
  };
}

// Alias for backward compatibility
export type AgentAnalysisResult = AgentResult;

export interface AgentMetadata {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
}

export interface AgentExecutionOptions {
  runnableConfig?: Record<string, unknown>;
  skipSelfRefinement?: boolean;
  maxQuestionsPerIteration?: number;
}

export enum AgentPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

