/**
 * Generic Issue Tracker Provider Interface
 *
 * This abstraction allows PR Agent to work with different issue tracking systems
 * (Jira, Linear, Azure DevOps, GitHub Issues, etc.) through a unified interface.
 *
 * MVP: Jira implementation via Atlassian MCP
 * Future: Linear, Azure DevOps, GitHub Issues, etc.
 */
/**
 * Normalized ticket/issue representation across all providers
 */
export interface IssueTicket {
    id: string;
    key: string;
    url: string;
    title: string;
    description: string;
    type: IssueType;
    status: string;
    priority: IssuePriority;
    assignee?: string;
    reporter?: string;
    labels: string[];
    components: string[];
    project?: string;
    storyPoints?: number;
    estimate?: string;
    acceptanceCriteria?: string;
    acceptanceCriteriaList?: string[];
    testScenarios?: string[];
    linkedTestCases?: string[];
    hasScreenshots: boolean;
    hasDiagrams: boolean;
    attachmentCount: number;
    parentKey?: string;
    epicKey?: string;
    linkedIssues: LinkedIssue[];
    subtasks: SubtaskInfo[];
    createdAt: string;
    updatedAt: string;
    rawData?: Record<string, unknown>;
}
export type IssueType = 'bug' | 'feature' | 'story' | 'task' | 'epic' | 'subtask' | 'improvement' | 'spike' | 'other';
export type IssuePriority = 'critical' | 'high' | 'medium' | 'low' | 'none';
export interface LinkedIssue {
    key: string;
    type: string;
    title: string;
    status: string;
}
export interface SubtaskInfo {
    key: string;
    title: string;
    status: string;
}
/**
 * Reference to a ticket found in PR metadata
 */
export interface TicketReference {
    key: string;
    source: 'title' | 'description' | 'branch' | 'commit' | 'manual';
    rawMatch: string;
    confidence: number;
}
/**
 * Issue tracker provider interface - implement this for each provider
 */
export interface IssueTrackerProvider {
    /**
     * Provider name for display and configuration
     */
    readonly name: string;
    /**
     * Provider type identifier
     */
    readonly type: IssueTrackerType;
    /**
     * Check if the provider is properly configured and accessible
     */
    isConfigured(): boolean;
    /**
     * Test connection to the provider
     */
    testConnection(): Promise<boolean>;
    /**
     * Fetch a single ticket by key
     */
    getTicket(key: string): Promise<IssueTicket | null>;
    /**
     * Fetch multiple tickets by keys
     */
    getTickets(keys: string[]): Promise<IssueTicket[]>;
    /**
     * Extract ticket references from PR metadata
     */
    extractTicketReferences(context: TicketExtractionContext): TicketReference[];
    /**
     * Search for tickets matching a query
     */
    searchTickets?(query: string, limit?: number): Promise<IssueTicket[]>;
    /**
     * Get ticket comments (if supported)
     */
    getComments?(ticketKey: string): Promise<IssueComment[]>;
}
export type IssueTrackerType = 'jira' | 'linear' | 'azure-devops' | 'github-issues' | 'gitlab-issues' | 'shortcut' | 'asana' | 'other';
export interface TicketExtractionContext {
    prTitle: string;
    prDescription?: string;
    branchName?: string;
    commitMessages?: string[];
}
export interface IssueComment {
    id: string;
    author: string;
    body: string;
    createdAt: string;
}
/**
 * Configuration for issue tracker integration
 */
export interface IssueTrackerConfig {
    enabled: boolean;
    provider: IssueTrackerType;
    providerConfig: Record<string, unknown>;
    analyzeAcceptanceCriteria: boolean;
    rateTicketQuality: boolean;
    generateTestSuggestions: boolean;
    checkScopeCreep: boolean;
    ticketPatterns?: string[];
    includeTicketDetails: boolean;
    verbose: boolean;
}
/**
 * Factory function type for creating providers
 */
export type IssueTrackerProviderFactory = (config: IssueTrackerConfig) => IssueTrackerProvider | null;
