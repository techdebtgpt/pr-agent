import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory where this module is located, then navigate to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve DB path relative to the project root (from src/db or dist/db)
// This ensures the database is always in the same location regardless of cwd
function resolveDbPath(): string {
  // Try environment variable first
  if (process.env.PR_AGENT_DB_PATH) {
    return process.env.PR_AGENT_DB_PATH;
  }

  // Navigate up from src/db or dist/db to project root
  const projectRoot = path.resolve(__dirname, '..', '..');
  return path.join(projectRoot, 'pr-agent.db');
}

const DB_PATH = resolveDbPath();

export interface AnalysisRecord {
  id?: number;
  pr_number: number;
  repo_owner: string;
  repo_name: string;
  author: string;
  title: string;
  complexity: number;
  risks_count: number;
  risks: string; // JSON
  recommendations: string; // JSON
  timestamp: string;
  // Dashboard improvements (PR #13)
  created_tests_count?: number;
  estimated_cost?: number; // Legacy field from PR #13
  // Smart change detection & DevOps analysis (v0.2.0)
  devops_cost_monthly?: number; // Estimated monthly AWS infrastructure cost
  devops_resources?: string; // JSON array of detected resources
  has_test_suggestions?: number; // 1 if test suggestions were generated
  test_suggestions_count?: number;
  coverage_percentage?: number;
  // Project classification cache (v0.3.0)
  project_classification?: string; // JSON - cached classification result
  // Peer Review / Jira Integration (v0.3.0)
  peer_review_enabled?: number; // 1 if peer review was run
  ticket_key?: string; // Primary Jira ticket key (e.g., PROJ-123)
  ticket_quality_score?: number; // Overall ticket quality score (0-100)
  ticket_quality_tier?: string; // excellent/good/adequate/poor/insufficient
  ac_compliance_percentage?: number; // Acceptance criteria compliance (0-100)
  ac_requirements_met?: number; // Number of requirements met
  ac_requirements_total?: number; // Total number of requirements
  peer_review_verdict?: string; // approve/request_changes/needs_discussion
  peer_review_blockers?: string; // JSON array of blockers
  peer_review_warnings?: string; // JSON array of warnings
  implementation_completeness?: number; // 0-100
  quality_score?: number; // 0-100
}

let db: Database.Database;

export function getDB(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    initDB();
  }
  return db;
}

function initDB() {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS pr_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pr_number INTEGER,
      repo_owner TEXT,
      repo_name TEXT,
      author TEXT,
      title TEXT,
      complexity INTEGER,
      risks_count INTEGER,
      risks TEXT,
      recommendations TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_tests_count INTEGER,
      estimated_cost REAL,
      devops_cost_monthly REAL,
      devops_resources TEXT,
      has_test_suggestions INTEGER,
      test_suggestions_count INTEGER,
      coverage_percentage REAL,
      project_classification TEXT,
      peer_review_enabled INTEGER,
      ticket_key TEXT,
      ticket_quality_score REAL,
      ticket_quality_tier TEXT,
      ac_compliance_percentage REAL,
      ac_requirements_met INTEGER,
      ac_requirements_total INTEGER,
      peer_review_verdict TEXT,
      peer_review_blockers TEXT,
      peer_review_warnings TEXT,
      implementation_completeness REAL,
      quality_score REAL
    )
  `);

  // Migration: Add columns to existing tables if they don't exist
  try {
    const tableInfo = db.prepare('PRAGMA table_info(pr_analysis)').all() as { name: string }[];
    const columnNames = tableInfo.map(col => col.name);

    // Dashboard improvements (PR #13)
    if (!columnNames.includes('created_tests_count')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN created_tests_count INTEGER DEFAULT 0');
    }
    if (!columnNames.includes('estimated_cost')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN estimated_cost REAL DEFAULT 0');
    }

    // DevOps/Infrastructure cost tracking (v0.2.0)
    if (!columnNames.includes('devops_cost_monthly')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN devops_cost_monthly REAL');
    }
    if (!columnNames.includes('devops_resources')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN devops_resources TEXT');
    }
    if (!columnNames.includes('has_test_suggestions')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN has_test_suggestions INTEGER');
    }
    if (!columnNames.includes('test_suggestions_count')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN test_suggestions_count INTEGER');
    }
    if (!columnNames.includes('coverage_percentage')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN coverage_percentage REAL');
    }
    // Project classification cache (v0.3.0)
    if (!columnNames.includes('project_classification')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN project_classification TEXT');
    }

    // Peer Review / Jira Integration (v0.3.0)
    if (!columnNames.includes('peer_review_enabled')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN peer_review_enabled INTEGER');
    }
    if (!columnNames.includes('ticket_key')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN ticket_key TEXT');
    }
    if (!columnNames.includes('ticket_quality_score')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN ticket_quality_score REAL');
    }
    if (!columnNames.includes('ticket_quality_tier')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN ticket_quality_tier TEXT');
    }
    if (!columnNames.includes('ac_compliance_percentage')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN ac_compliance_percentage REAL');
    }
    if (!columnNames.includes('ac_requirements_met')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN ac_requirements_met INTEGER');
    }
    if (!columnNames.includes('ac_requirements_total')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN ac_requirements_total INTEGER');
    }
    if (!columnNames.includes('peer_review_verdict')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN peer_review_verdict TEXT');
    }
    if (!columnNames.includes('peer_review_blockers')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN peer_review_blockers TEXT');
    }
    if (!columnNames.includes('peer_review_warnings')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN peer_review_warnings TEXT');
    }
    if (!columnNames.includes('implementation_completeness')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN implementation_completeness REAL');
    }
    if (!columnNames.includes('quality_score')) {
      db.exec('ALTER TABLE pr_analysis ADD COLUMN quality_score REAL');
    }
  } catch (e) {
    // Ignore migration errors - columns may already exist
  }
}

export function saveAnalysis(record: Omit<AnalysisRecord, 'id' | 'timestamp'> & { timestamp?: string }) {
  const db = getDB();

  // Prepare values with defaults for all optional fields
  const safeRecord = {
    ...record,
    created_tests_count: record.created_tests_count || 0,
    estimated_cost: record.estimated_cost || 0,
    coverage_percentage: record.coverage_percentage || null,
    // DevOps fields (v0.2.0)
    devops_cost_monthly: record.devops_cost_monthly || null,
    devops_resources: record.devops_resources || null,
    has_test_suggestions: record.has_test_suggestions || null,
    test_suggestions_count: record.test_suggestions_count || null,
    // Peer review fields (v0.3.0)
    peer_review_enabled: record.peer_review_enabled || null,
    ticket_key: record.ticket_key || null,
    ticket_quality_score: record.ticket_quality_score || null,
    ticket_quality_tier: record.ticket_quality_tier || null,
    ac_compliance_percentage: record.ac_compliance_percentage || null,
    ac_requirements_met: record.ac_requirements_met || null,
    ac_requirements_total: record.ac_requirements_total || null,
    peer_review_verdict: record.peer_review_verdict || null,
    peer_review_blockers: record.peer_review_blockers || null,
    peer_review_warnings: record.peer_review_warnings || null,
    implementation_completeness: record.implementation_completeness || null,
    quality_score: record.quality_score || null,
  };

  if (record.timestamp) {
    const stmt = db.prepare(`
        INSERT INTO pr_analysis (
          pr_number, repo_owner, repo_name, author, title,
          complexity, risks_count, risks, recommendations, timestamp,
          created_tests_count, estimated_cost,
          devops_cost_monthly, devops_resources, has_test_suggestions, test_suggestions_count, coverage_percentage,
          project_classification,
          peer_review_enabled, ticket_key, ticket_quality_score, ticket_quality_tier,
          ac_compliance_percentage, ac_requirements_met, ac_requirements_total,
          peer_review_verdict, peer_review_blockers, peer_review_warnings,
          implementation_completeness, quality_score
        ) VALUES (
          @pr_number, @repo_owner, @repo_name, @author, @title,
          @complexity, @risks_count, @risks, @recommendations, @timestamp,
          @created_tests_count, @estimated_cost,
          @devops_cost_monthly, @devops_resources, @has_test_suggestions, @test_suggestions_count, @coverage_percentage,
          @project_classification,
          @peer_review_enabled, @ticket_key, @ticket_quality_score, @ticket_quality_tier,
          @ac_compliance_percentage, @ac_requirements_met, @ac_requirements_total,
          @peer_review_verdict, @peer_review_blockers, @peer_review_warnings,
          @implementation_completeness, @quality_score
        )
      `);
    stmt.run(safeRecord);
  } else {
    const stmt = db.prepare(`
        INSERT INTO pr_analysis (
          pr_number, repo_owner, repo_name, author, title,
          complexity, risks_count, risks, recommendations,
          created_tests_count, estimated_cost,
          devops_cost_monthly, devops_resources, has_test_suggestions, test_suggestions_count, coverage_percentage,
          project_classification,
          peer_review_enabled, ticket_key, ticket_quality_score, ticket_quality_tier,
          ac_compliance_percentage, ac_requirements_met, ac_requirements_total,
          peer_review_verdict, peer_review_blockers, peer_review_warnings,
          implementation_completeness, quality_score
        ) VALUES (
          @pr_number, @repo_owner, @repo_name, @author, @title,
          @complexity, @risks_count, @risks, @recommendations,
          @created_tests_count, @estimated_cost,
          @devops_cost_monthly, @devops_resources, @has_test_suggestions, @test_suggestions_count, @coverage_percentage,
          @project_classification,
          @peer_review_enabled, @ticket_key, @ticket_quality_score, @ticket_quality_tier,
          @ac_compliance_percentage, @ac_requirements_met, @ac_requirements_total,
          @peer_review_verdict, @peer_review_blockers, @peer_review_warnings,
          @implementation_completeness, @quality_score
        )
      `);
    stmt.run(safeRecord);
  }
}

/**
 * Get cached project classification for a repository
 * Returns the most recent classification if available
 */
export function getProjectClassification(repoOwner: string, repoName: string): string | null {
  const db = getDB();
  const result = db.prepare(`
    SELECT project_classification 
    FROM pr_analysis 
    WHERE repo_owner = ? AND repo_name = ? AND project_classification IS NOT NULL
    ORDER BY timestamp DESC 
    LIMIT 1
  `).get(repoOwner, repoName) as { project_classification: string } | undefined;

  return result?.project_classification || null;
}

export function getCommonRecommendations(limit = 5) {
  const db = getDB();
  const rows = db.prepare('SELECT recommendations FROM pr_analysis').all() as { recommendations: string }[];

  const frequency: Record<string, number> = {};

  rows.forEach(row => {
    try {
      const recs = JSON.parse(row.recommendations) as string[];
      recs.forEach(rec => {
        // Simple normalization: first 50 chars to group similar start phrases
        // In reality, this needs NLP clustering, but simple grouping works for identical strings
        const key = rec.trim();
        frequency[key] = (frequency[key] || 0) + 1;
      });
    } catch (e) {
      // ignore parse errors
    }
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1]) // Descending order
    .slice(0, limit)
    .map(([text, count]) => ({ text, count }));
}

export function getComplexityDistribution() {
  const db = getDB();
  // Group by complexity buckets
  const rows = db.prepare(`
    SELECT 
      CASE 
        WHEN complexity <= 2 THEN 'Low'
        WHEN complexity <= 4 THEN 'Medium'
        ELSE 'High'
      END as category,
      COUNT(*) as count
    FROM pr_analysis
    GROUP BY category
  `).all() as { category: string, count: number }[];

  const distribution = { Low: 0, Medium: 0, High: 0 };
  rows.forEach(r => {
    if (r.category === 'Low') distribution.Low = r.count;
    else if (r.category === 'Medium') distribution.Medium = r.count;
    else if (r.category === 'High') distribution.High = r.count;
  });

  return Object.values(distribution); // [Low, Medium, High]
}

export function getWeeklyQualityTrend() {
  const db = getDB();
  // SQLite doesn't have great date functions, so we'll group by YYYY-MM-DD and aggregate in JS or simple substr
  // Grouping by day for better granularity, frontend can aggregate to weeks if needed
  const rows = db.prepare(`
    SELECT 
      substr(timestamp, 1, 10) as date,
      AVG(complexity) as avg_complexity,
      COUNT(*) as count
    FROM pr_analysis 
    GROUP BY date
    ORDER BY date ASC
    LIMIT 30
  `).all() as { date: string, avg_complexity: number, count: number }[];

  return rows;
}

export function getDashboardStats() {
  const db = getDB();

  // Total PRs
  const totalPRs = db.prepare('SELECT COUNT(*) as count FROM pr_analysis').get() as { count: number };

  // "Successful" PRs (defined as complexity < 3 and 0 risks for this MVP)
  const successfulPRs = db.prepare('SELECT COUNT(*) as count FROM pr_analysis WHERE complexity < 3 AND risks_count = 0').get() as { count: number };

  // Average Complexity
  const avgComplexity = db.prepare('SELECT AVG(complexity) as avg FROM pr_analysis').get() as { avg: number };

  // Stats per Creator
  const perCreator = db.prepare(`
    SELECT author, COUNT(*) as count, AVG(complexity) as avg_complexity
    FROM pr_analysis
    GROUP BY author
    ORDER BY count DESC
    LIMIT 10
  `).all();

  const commonRecommendations = getCommonRecommendations(5);
  const complexityDistribution = getComplexityDistribution();
  const qualityTrend = getWeeklyQualityTrend();

  // New Aggregations
  const totalTestsCreated = db.prepare('SELECT SUM(created_tests_count) as count FROM pr_analysis').get() as { count: number };
  const avgCoverage = db.prepare('SELECT AVG(coverage_percentage) as avg FROM pr_analysis WHERE coverage_percentage IS NOT NULL').get() as { avg: number };
  const terraformCost = db.prepare('SELECT SUM(estimated_cost) as cost FROM pr_analysis').get() as { cost: number };

  // Jira Compliance Stats (v0.3.0)
  const jiraComplianceStats = getJiraComplianceStats();

  return {
    totalPRs: totalPRs.count,
    successRate: totalPRs.count > 0 ? (successfulPRs.count / totalPRs.count) * 100 : 0,
    avgComplexity: avgComplexity.avg || 0,
    perCreator,
    commonRecommendations,
    complexityDistribution,
    qualityTrend,
    // Dashboard improvements (PR #13)
    metrics: {
      testsCreated: totalTestsCreated.count || 0,
      avgCoverage: avgCoverage.avg || 0,
      terraformCost: terraformCost.cost || 0
    },
    // DevOps/Infrastructure cost data (v0.2.0)
    devOpsCosts: getDevOpsCostStats(),
    // Jira Compliance (v0.3.0)
    jiraCompliance: jiraComplianceStats,
  };
}

export function getRecentAnalyses(limit = 10) {
  const db = getDB();
  return db.prepare('SELECT * FROM pr_analysis ORDER BY timestamp DESC LIMIT ?').all(limit);
}

// ========== DevOps Cost Tracking Functions (v0.2.0) ==========

export interface DevOpsCostStats {
  totalMonthlyEstimate: number;
  analysesWithDevOps: number;
  averageDevOpsCost: number;
  resourceTypes: Record<string, number>; // Count by resource type
  costTrend: Array<{ date: string; cost: number }>;
  testSuggestionStats: {
    analysesWithSuggestions: number;
    totalSuggestions: number;
  };
  coverageStats: {
    analysesWithCoverage: number;
    averageCoverage: number;
  };
}

/**
 * Get DevOps/Infrastructure cost statistics
 */
export function getDevOpsCostStats(): DevOpsCostStats {
  const db = getDB();

  // Total DevOps cost estimates
  const devOpsTotals = db.prepare(`
    SELECT 
      COALESCE(SUM(devops_cost_monthly), 0) as total_monthly,
      COUNT(CASE WHEN devops_cost_monthly > 0 THEN 1 END) as analyses_with_devops
    FROM pr_analysis
    WHERE devops_cost_monthly IS NOT NULL
  `).get() as { total_monthly: number; analyses_with_devops: number };

  // Resource type breakdown (from JSON column)
  const resourceRows = db.prepare(`
    SELECT devops_resources
    FROM pr_analysis
    WHERE devops_resources IS NOT NULL AND devops_resources != ''
  `).all() as { devops_resources: string }[];

  const resourceTypes: Record<string, number> = {};
  for (const row of resourceRows) {
    try {
      const resources = JSON.parse(row.devops_resources) as Array<{ resourceType: string }>;
      for (const resource of resources) {
        resourceTypes[resource.resourceType] = (resourceTypes[resource.resourceType] || 0) + 1;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Cost trend (last 30 days)
  const costTrend = db.prepare(`
    SELECT 
      substr(timestamp, 1, 10) as date,
      COALESCE(SUM(devops_cost_monthly), 0) as cost
    FROM pr_analysis
    WHERE devops_cost_monthly IS NOT NULL
      AND timestamp >= datetime('now', '-30 days')
    GROUP BY date
    ORDER BY date ASC
  `).all() as { date: string; cost: number }[];

  // Test suggestion stats
  const testStats = db.prepare(`
    SELECT 
      COUNT(CASE WHEN has_test_suggestions = 1 THEN 1 END) as analyses_with_suggestions,
      COALESCE(SUM(test_suggestions_count), 0) as total_suggestions
    FROM pr_analysis
  `).get() as { analyses_with_suggestions: number; total_suggestions: number };

  // Coverage stats
  const coverageStats = db.prepare(`
    SELECT 
      COUNT(CASE WHEN coverage_percentage IS NOT NULL THEN 1 END) as analyses_with_coverage,
      COALESCE(AVG(coverage_percentage), 0) as avg_coverage
    FROM pr_analysis
    WHERE coverage_percentage IS NOT NULL
  `).get() as { analyses_with_coverage: number; avg_coverage: number };

  return {
    totalMonthlyEstimate: devOpsTotals.total_monthly,
    analysesWithDevOps: devOpsTotals.analyses_with_devops,
    averageDevOpsCost: devOpsTotals.analyses_with_devops > 0
      ? devOpsTotals.total_monthly / devOpsTotals.analyses_with_devops
      : 0,
    resourceTypes,
    costTrend,
    testSuggestionStats: {
      analysesWithSuggestions: testStats.analyses_with_suggestions,
      totalSuggestions: testStats.total_suggestions,
    },
    coverageStats: {
      analysesWithCoverage: coverageStats.analyses_with_coverage,
      averageCoverage: coverageStats.avg_coverage,
    },
  };
}

// ========== Jira Compliance Stats (v0.3.0) ==========

export interface JiraComplianceStats {
  satisfied: number; // PRs with AC compliance >= 70%
  missed: number; // PRs with AC compliance < 70%
  totalWithPeerReview: number;
  averageTicketQuality: number;
  averageACCompliance: number;
  verdictBreakdown: {
    approved: number;
    requestChanges: number;
    needsDiscussion: number;
  };
  ticketQualityTiers: {
    excellent: number;
    good: number;
    adequate: number;
    poor: number;
    insufficient: number;
  };
}

/**
 * Get Jira compliance statistics for the dashboard
 */
export function getJiraComplianceStats(): JiraComplianceStats {
  const db = getDB();

  // Count PRs with peer review enabled
  const peerReviewCounts = db.prepare(`
    SELECT
      COUNT(CASE WHEN peer_review_enabled = 1 THEN 1 END) as total_with_peer_review,
      COUNT(CASE WHEN peer_review_enabled = 1 AND ac_compliance_percentage >= 70 THEN 1 END) as satisfied,
      COUNT(CASE WHEN peer_review_enabled = 1 AND ac_compliance_percentage < 70 THEN 1 END) as missed
    FROM pr_analysis
  `).get() as { total_with_peer_review: number; satisfied: number; missed: number };

  // Average scores
  const avgScores = db.prepare(`
    SELECT
      COALESCE(AVG(ticket_quality_score), 0) as avg_ticket_quality,
      COALESCE(AVG(ac_compliance_percentage), 0) as avg_ac_compliance
    FROM pr_analysis
    WHERE peer_review_enabled = 1
  `).get() as { avg_ticket_quality: number; avg_ac_compliance: number };

  // Verdict breakdown
  const verdictCounts = db.prepare(`
    SELECT
      COUNT(CASE WHEN peer_review_verdict = 'approve' THEN 1 END) as approved,
      COUNT(CASE WHEN peer_review_verdict = 'request_changes' THEN 1 END) as request_changes,
      COUNT(CASE WHEN peer_review_verdict = 'needs_discussion' THEN 1 END) as needs_discussion
    FROM pr_analysis
    WHERE peer_review_enabled = 1
  `).get() as { approved: number; request_changes: number; needs_discussion: number };

  // Ticket quality tier breakdown
  const tierCounts = db.prepare(`
    SELECT
      COUNT(CASE WHEN ticket_quality_tier = 'excellent' THEN 1 END) as excellent,
      COUNT(CASE WHEN ticket_quality_tier = 'good' THEN 1 END) as good,
      COUNT(CASE WHEN ticket_quality_tier = 'adequate' THEN 1 END) as adequate,
      COUNT(CASE WHEN ticket_quality_tier = 'poor' THEN 1 END) as poor,
      COUNT(CASE WHEN ticket_quality_tier = 'insufficient' THEN 1 END) as insufficient
    FROM pr_analysis
    WHERE peer_review_enabled = 1
  `).get() as { excellent: number; good: number; adequate: number; poor: number; insufficient: number };

  return {
    satisfied: peerReviewCounts.satisfied,
    missed: peerReviewCounts.missed,
    totalWithPeerReview: peerReviewCounts.total_with_peer_review,
    averageTicketQuality: avgScores.avg_ticket_quality,
    averageACCompliance: avgScores.avg_ac_compliance,
    verdictBreakdown: {
      approved: verdictCounts.approved,
      requestChanges: verdictCounts.request_changes,
      needsDiscussion: verdictCounts.needs_discussion,
    },
    ticketQualityTiers: {
      excellent: tierCounts.excellent,
      good: tierCounts.good,
      adequate: tierCounts.adequate,
      poor: tierCounts.poor,
      insufficient: tierCounts.insufficient,
    },
  };
}
