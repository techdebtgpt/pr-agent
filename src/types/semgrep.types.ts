/**
 * Semgrep types for static analysis integration
 */

export type SemgrepSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface SemgrepFinding {
  check_id: string;
  path: string;
  start: {
    line: number;
    col: number;
    offset: number;
  };
  end: {
    line: number;
    col: number;
    offset: number;
  };
  extra: {
    message: string;
    severity: SemgrepSeverity;
    metadata: {
      category?: string;
      cwe?: string[];
      owasp?: string[];
      confidence?: string;
      impact?: string;
      likelihood?: string;
      technology?: string[];
      references?: string[];
      subcategory?: string[];
      vulnerability_class?: string[];
    };
    lines?: string;
    fingerprint?: string;
  };
}

export interface SemgrepResult {
  results: SemgrepFinding[];
  errors: Array<{
    level: string;
    type: string;
    message?: string;
    path?: string;
    spans?: Array<{
      file: string;
      start: { line: number; col: number };
      end: { line: number; col: number };
    }>;
  }>;
  version?: string;
  stats?: {
    total_rules: number;
    files_scanned: number;
    analysis_time: number;
  };
}

export interface SemgrepSummary {
  totalFindings: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  categoriesAffected: string[];
  criticalFindings: SemgrepFinding[];
  filesWithIssues: string[];
}

export interface SemgrepConfig {
  enabled: boolean;
  rulesets?: string[]; // e.g., ['auto', 'p/security-audit', 'p/owasp-top-ten']
  excludePaths?: string[];
  timeout?: number; // seconds
  maxFileSize?: number; // bytes
}

