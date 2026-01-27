/**
 * Jira types and interfaces for Peer Review Agent
 * Provides structures for Jira ticket analysis and acceptance criteria validation
 */

/**
 * Jira ticket from the Atlassian API/MCP
 */
export interface JiraTicket {
  key: string;                    // e.g., "PROJ-123"
  id: string;                     // Jira internal ID
  summary: string;                // Ticket title
  description: string;            // Full description (may contain markdown/rich text)
  status: string;                 // e.g., "In Progress", "In Review", "Done"
  type: JiraTicketType;           // bug, feature, task, story, epic
  priority: string;               // e.g., "High", "Medium", "Low"
  assignee?: string;              // Assignee display name
  reporter?: string;              // Reporter display name
  labels: string[];               // Labels/tags
  components: string[];           // Affected components
  fixVersions: string[];          // Target release versions
  storyPoints?: number;           // Story points estimate
  createdAt: string;              // ISO date string
  updatedAt: string;              // ISO date string

  // Acceptance criteria - can be in description or custom field
  acceptanceCriteria?: string;    // Extracted AC text
  acceptanceCriteriaItems?: AcceptanceCriteriaItem[];

  // Test-related fields
  testScenarios?: string[];       // Listed test scenarios
  testCases?: string[];           // Linked test cases

  // Additional context
  attachments?: JiraAttachment[];
  linkedIssues?: JiraLinkedIssue[];
  comments?: JiraComment[];
  subtasks?: JiraSubtask[];
  parentKey?: string;             // If this is a subtask
  epicKey?: string;               // Parent epic

  // Raw fields for custom field access
  customFields?: Record<string, unknown>;
}

export type JiraTicketType = 'bug' | 'feature' | 'task' | 'story' | 'epic' | 'subtask' | 'improvement' | 'other';

export interface AcceptanceCriteriaItem {
  id: string;                     // Generated ID for tracking
  text: string;                   // The AC text
  isMet?: boolean;                // Whether this AC is covered by the PR
  coverageDetails?: string;       // Explanation of how it's covered
  relatedFiles?: string[];        // Files that implement this AC
  confidence: number;             // 0-100 confidence in assessment
}

export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  url: string;
  createdAt: string;
  isScreenshot: boolean;
}

export interface JiraLinkedIssue {
  key: string;
  type: string;                   // "blocks", "is blocked by", "relates to", etc.
  summary: string;
  status: string;
}

export interface JiraComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface JiraSubtask {
  key: string;
  summary: string;
  status: string;
}

/**
 * Ticket quality rating based on best practices
 */
export interface TicketQualityRating {
  overallScore: number;           // 0-100 composite score

  // Individual dimension scores (0-100)
  dimensions: {
    descriptionClarity: number;   // Is the description clear and complete?
    acceptanceCriteriaQuality: number;  // Are ACs specific, measurable, testable?
    testabilityScore: number;     // Are test scenarios/cases defined?
    scopeDefinition: number;      // Is scope well-defined and bounded?
    technicalContext: number;     // Are technical details/constraints provided?
    visualDocumentation: number;  // Screenshots, diagrams, mockups?
    estimationQuality: number;    // Story points reasonable for scope?
    completeness: number;         // Overall ticket completeness
  };

  // Detailed feedback for each dimension
  feedback: {
    strengths: string[];          // What's good about the ticket
    weaknesses: string[];         // What's missing or unclear
    suggestions: string[];        // How to improve the ticket
  };

  // Quality tier based on score
  tier: 'excellent' | 'good' | 'adequate' | 'poor' | 'insufficient';

  // Can we provide meaningful PR review with this ticket?
  reviewable: boolean;
  reviewabilityReason: string;
}

/**
 * Result of acceptance criteria validation against PR changes
 */
export interface AcceptanceCriteriaValidation {
  ticketKey: string;
  totalCriteria: number;
  metCriteria: number;
  unmetCriteria: number;
  partialCriteria: number;

  // Detailed per-criteria analysis
  criteriaAnalysis: CriteriaAnalysisItem[];

  // Overall compliance percentage
  compliancePercentage: number;

  // Summary of gaps
  gaps: AcceptanceCriteriaGap[];

  // Suggested test scenarios for uncovered cases
  suggestedTestScenarios: TestScenarioSuggestion[];
}

export interface CriteriaAnalysisItem {
  criteriaId: string;
  criteriaText: string;
  status: 'met' | 'unmet' | 'partial' | 'unclear';
  confidence: number;             // 0-100
  evidence: string[];             // Code snippets or file references that show coverage
  explanation: string;            // Why we think it's met/unmet
  relatedFiles: string[];         // Files that relate to this criteria
}

export interface AcceptanceCriteriaGap {
  criteriaText: string;
  gapDescription: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedAction: string;
}

export interface TestScenarioSuggestion {
  scenario: string;               // Test scenario description
  type: 'unit' | 'integration' | 'e2e' | 'manual';
  priority: 'high' | 'medium' | 'low';
  relatedCriteria: string[];      // Which AC this tests
  suggestedApproach: string;      // How to implement the test
}

/**
 * Complete Jira analysis result for a PR
 */
export interface JiraAnalysisResult {
  // Linked tickets found in PR
  linkedTickets: JiraTicket[];
  primaryTicket?: JiraTicket;     // Main ticket (first found or specified)

  // Ticket quality assessment
  ticketQuality?: TicketQualityRating;

  // Acceptance criteria validation
  acValidation?: AcceptanceCriteriaValidation;

  // Cross-reference with PR changes
  scopeAnalysis: {
    inScope: string[];            // Changes that align with ticket scope
    outOfScope: string[];         // Changes that seem unrelated
    scopeCreepRisk: boolean;
    scopeCreepDetails?: string;
  };

  // Edge cases and test coverage
  edgeCaseAnalysis: {
    identifiedEdgeCases: string[];
    coveredEdgeCases: string[];
    uncoveredEdgeCases: string[];
    testSuggestions: TestScenarioSuggestion[];
  };

  // Overall assessment
  overallAssessment: {
    implementationCompleteness: number;  // 0-100
    qualityScore: number;                 // 0-100
    readyForReview: boolean;
    blockers: string[];
    warnings: string[];
    recommendations: string[];
  };

  // Metrics summary
  metrics: {
    ticketsCovered: number;
    criteriaTotal: number;
    criteriaMet: number;
    criteriaPartial: number;
    criteriaUnmet: number;
    testScenariosGenerated: number;
  };
}

/**
 * Configuration for Jira integration
 */
export interface JiraConfig {
  enabled: boolean;

  // MCP connection settings
  mcpServerUrl?: string;          // If using custom MCP server

  // Jira instance settings (for direct API if needed)
  instanceUrl?: string;           // e.g., "https://company.atlassian.net"
  projectKey?: string;            // Default project key

  // Authentication (via MCP or direct)
  apiToken?: string;              // Jira API token
  email?: string;                 // Jira account email

  // Analysis settings
  analyzeAcceptanceCriteria: boolean;
  rateTicketQuality: boolean;
  generateTestSuggestions: boolean;
  checkScopeCreep: boolean;

  // Output settings
  includeTicketDetailsInOutput: boolean;
  verboseOutput: boolean;
}

/**
 * Ticket reference extracted from PR title/description/branch
 */
export interface TicketReference {
  key: string;                    // e.g., "PROJ-123"
  source: 'title' | 'description' | 'branch' | 'commit';
  confidence: number;             // How confident we are this is the right ticket
}

/**
 * Context passed to Jira sub-agent
 */
export interface JiraAnalysisContext {
  prTitle: string;
  prDescription?: string;
  branchName?: string;
  commitMessages?: string[];
  diff: string;
  files: Array<{
    path: string;
    additions: number;
    deletions: number;
    status: string;
  }>;

  // Pre-analyzed PR data
  prSummary?: string;
  prRisks?: string[];
  prComplexity?: number;

  // Jira config
  config: JiraConfig;
}
