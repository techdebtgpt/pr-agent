/**
 * Jira types and interfaces for Peer Review Agent
 * Provides structures for Jira ticket analysis and acceptance criteria validation
 */
/**
 * Jira ticket from the Atlassian API/MCP
 */
export interface JiraTicket {
    key: string;
    id: string;
    summary: string;
    description: string;
    status: string;
    type: JiraTicketType;
    priority: string;
    assignee?: string;
    reporter?: string;
    labels: string[];
    components: string[];
    fixVersions: string[];
    storyPoints?: number;
    createdAt: string;
    updatedAt: string;
    acceptanceCriteria?: string;
    acceptanceCriteriaItems?: AcceptanceCriteriaItem[];
    testScenarios?: string[];
    testCases?: string[];
    attachments?: JiraAttachment[];
    linkedIssues?: JiraLinkedIssue[];
    comments?: JiraComment[];
    subtasks?: JiraSubtask[];
    parentKey?: string;
    epicKey?: string;
    customFields?: Record<string, unknown>;
}
export type JiraTicketType = 'bug' | 'feature' | 'task' | 'story' | 'epic' | 'subtask' | 'improvement' | 'other';
export interface AcceptanceCriteriaItem {
    id: string;
    text: string;
    isMet?: boolean;
    coverageDetails?: string;
    relatedFiles?: string[];
    confidence: number;
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
    type: string;
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
    overallScore: number;
    dimensions: {
        descriptionClarity: number;
        acceptanceCriteriaQuality: number;
        testabilityScore: number;
        scopeDefinition: number;
        technicalContext: number;
        visualDocumentation: number;
        estimationQuality: number;
        completeness: number;
    };
    feedback: {
        strengths: string[];
        weaknesses: string[];
        suggestions: string[];
    };
    tier: 'excellent' | 'good' | 'adequate' | 'poor' | 'insufficient';
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
    criteriaAnalysis: CriteriaAnalysisItem[];
    compliancePercentage: number;
    gaps: AcceptanceCriteriaGap[];
    suggestedTestScenarios: TestScenarioSuggestion[];
}
export interface CriteriaAnalysisItem {
    criteriaId: string;
    criteriaText: string;
    status: 'met' | 'unmet' | 'partial' | 'unclear';
    confidence: number;
    evidence: string[];
    explanation: string;
    relatedFiles: string[];
}
export interface AcceptanceCriteriaGap {
    criteriaText: string;
    gapDescription: string;
    severity: 'critical' | 'major' | 'minor';
    suggestedAction: string;
}
export interface TestScenarioSuggestion {
    scenario: string;
    type: 'unit' | 'integration' | 'e2e' | 'manual';
    priority: 'high' | 'medium' | 'low';
    relatedCriteria: string[];
    suggestedApproach: string;
}
/**
 * Complete Jira analysis result for a PR
 */
export interface JiraAnalysisResult {
    linkedTickets: JiraTicket[];
    primaryTicket?: JiraTicket;
    ticketQuality?: TicketQualityRating;
    acValidation?: AcceptanceCriteriaValidation;
    scopeAnalysis: {
        inScope: string[];
        outOfScope: string[];
        scopeCreepRisk: boolean;
        scopeCreepDetails?: string;
    };
    edgeCaseAnalysis: {
        identifiedEdgeCases: string[];
        coveredEdgeCases: string[];
        uncoveredEdgeCases: string[];
        testSuggestions: TestScenarioSuggestion[];
    };
    overallAssessment: {
        implementationCompleteness: number;
        qualityScore: number;
        readyForReview: boolean;
        blockers: string[];
        warnings: string[];
        recommendations: string[];
    };
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
    mcpServerUrl?: string;
    instanceUrl?: string;
    projectKey?: string;
    apiToken?: string;
    email?: string;
    analyzeAcceptanceCriteria: boolean;
    rateTicketQuality: boolean;
    generateTestSuggestions: boolean;
    checkScopeCreep: boolean;
    includeTicketDetailsInOutput: boolean;
    verboseOutput: boolean;
}
/**
 * Ticket reference extracted from PR title/description/branch
 */
export interface TicketReference {
    key: string;
    source: 'title' | 'description' | 'branch' | 'commit';
    confidence: number;
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
    prSummary?: string;
    prRisks?: string[];
    prComplexity?: number;
    config: JiraConfig;
}
