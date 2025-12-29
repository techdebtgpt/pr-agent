/**
 * Jira MCP Client
 *
 * Implements IssueTrackerProvider interface using the Atlassian MCP server.
 * This client fetches Jira tickets and extracts ticket references from PR metadata.
 *
 * The MCP server is expected to provide Jira access through its tools.
 * For environments without MCP, falls back to direct Jira API (if configured).
 */

import {
  IssueTrackerProvider,
  IssueTrackerType,
  IssueTicket,
  IssueType,
  IssuePriority,
  TicketReference,
  TicketExtractionContext,
  IssueComment,
  LinkedIssue,
  SubtaskInfo,
} from '../types/issue-tracker.types.js';

// Jira-specific configuration
export interface JiraConfig {
  // MCP-based access (preferred)
  useMcp: boolean;

  // Direct API access (fallback)
  instanceUrl?: string;
  email?: string;
  apiToken?: string;

  // Project settings
  defaultProject?: string;

  // Custom field mappings
  acceptanceCriteriaField?: string; // Custom field ID for AC
  storyPointsField?: string; // Custom field ID for story points

  // Ticket patterns for extraction
  ticketPatterns?: string[];
}

// Default patterns to match Jira ticket keys
const DEFAULT_TICKET_PATTERNS = [
  /([A-Z][A-Z0-9]+-\d+)/g, // Standard Jira format: PROJ-123
];

export class JiraMcpClient implements IssueTrackerProvider {
  readonly name = 'Jira';
  readonly type: IssueTrackerType = 'jira';

  private config: JiraConfig;
  private ticketPatterns: RegExp[];

  // MCP callback for making MCP tool calls
  // This is injected at runtime when MCP is available
  private mcpCallback?: (
    tool: string,
    params: Record<string, unknown>
  ) => Promise<unknown>;

  constructor(config: JiraConfig) {
    this.config = config;
    this.ticketPatterns = this.buildTicketPatterns();
  }

  /**
   * Set the MCP callback function for making MCP tool calls
   */
  setMcpCallback(
    callback: (
      tool: string,
      params: Record<string, unknown>
    ) => Promise<unknown>
  ): void {
    this.mcpCallback = callback;
  }

  /**
   * Check if the client is properly configured
   */
  isConfigured(): boolean {
    if (this.config.useMcp) {
      return !!this.mcpCallback;
    }
    // Direct API requires instance URL and credentials
    return !!(
      this.config.instanceUrl &&
      this.config.email &&
      this.config.apiToken
    );
  }

  /**
   * Test connection to Jira
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to fetch any ticket to verify connection
      if (this.config.useMcp && this.mcpCallback) {
        // Use MCP to test connection
        const result = await this.mcpCallback('atlassian:search-company-knowledge', {
          query: 'test connection',
          limit: 1,
        });
        return !!result;
      } else if (this.config.instanceUrl) {
        // Direct API test
        const response = await this.fetchJiraApi('/rest/api/3/myself');
        return response.ok;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Extract ticket references from PR metadata
   */
  extractTicketReferences(context: TicketExtractionContext): TicketReference[] {
    const references: Map<string, TicketReference> = new Map();

    // Extract from title (highest confidence)
    this.extractFromText(context.prTitle, 'title', 95, references);

    // Extract from branch name (high confidence)
    if (context.branchName) {
      this.extractFromText(context.branchName, 'branch', 90, references);
    }

    // Extract from description (medium confidence)
    if (context.prDescription) {
      this.extractFromText(context.prDescription, 'description', 80, references);
    }

    // Extract from commit messages (lower confidence due to potential noise)
    if (context.commitMessages) {
      for (const msg of context.commitMessages) {
        this.extractFromText(msg, 'commit', 70, references);
      }
    }

    // Sort by confidence (highest first)
    return Array.from(references.values()).sort(
      (a, b) => b.confidence - a.confidence
    );
  }

  /**
   * Fetch a single ticket by key
   */
  async getTicket(key: string): Promise<IssueTicket | null> {
    try {
      const rawTicket = await this.fetchJiraTicket(key);
      if (!rawTicket) return null;
      return this.normalizeTicket(rawTicket);
    } catch (error) {
      console.error(`Failed to fetch ticket ${key}:`, error);
      return null;
    }
  }

  /**
   * Fetch multiple tickets by keys
   */
  async getTickets(keys: string[]): Promise<IssueTicket[]> {
    const tickets: IssueTicket[] = [];

    // Fetch in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((key) => this.getTicket(key))
      );
      tickets.push(...results.filter((t): t is IssueTicket => t !== null));
    }

    return tickets;
  }

  /**
   * Search for tickets matching a query
   */
  async searchTickets(query: string, limit = 10): Promise<IssueTicket[]> {
    try {
      if (this.config.useMcp && this.mcpCallback) {
        // Use MCP search
        const result = await this.mcpCallback('atlassian:search-company-knowledge', {
          query,
          limit,
        });
        // Parse and normalize results
        if (Array.isArray(result)) {
          return result.map((r) => this.normalizeTicket(r as JiraApiIssue));
        }
      } else {
        // Direct JQL search
        const jql = `text ~ "${query}" ORDER BY updated DESC`;
        const response = await this.fetchJiraApi(
          `/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${limit}`
        );
        if (response.ok) {
          const data = await response.json() as { issues?: JiraApiIssue[] };
          return (data.issues || []).map((issue: JiraApiIssue) =>
            this.normalizeTicket(issue)
          );
        }
      }
    } catch (error) {
      console.error('Failed to search tickets:', error);
    }
    return [];
  }

  /**
   * Get comments for a ticket
   */
  async getComments(ticketKey: string): Promise<IssueComment[]> {
    try {
      const response = await this.fetchJiraApi(
        `/rest/api/3/issue/${ticketKey}/comment`
      );
      if (response.ok) {
        const data = await response.json() as { comments?: JiraApiComment[] };
        return (data.comments || []).map((c: JiraApiComment) => {
          let bodyText = '';
          if (typeof c.body === 'string') {
            bodyText = c.body;
          } else if (c.body && typeof c.body === 'object' && 'content' in c.body) {
            bodyText = c.body.content?.[0]?.content?.[0]?.text || '';
          }
          return {
            id: c.id,
            author: c.author?.displayName || 'Unknown',
            body: bodyText,
            createdAt: c.created,
          };
        });
      }
    } catch (error) {
      console.error(`Failed to get comments for ${ticketKey}:`, error);
    }
    return [];
  }

  // ========== Private Helper Methods ==========

  private buildTicketPatterns(): RegExp[] {
    if (this.config.ticketPatterns?.length) {
      return this.config.ticketPatterns.map((p) => new RegExp(p, 'g'));
    }
    return DEFAULT_TICKET_PATTERNS;
  }

  private extractFromText(
    text: string,
    source: TicketReference['source'],
    baseConfidence: number,
    references: Map<string, TicketReference>
  ): void {
    for (const pattern of this.ticketPatterns) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const key = match[1] || match[0];
        const upperKey = key.toUpperCase();

        // Skip if we already have this reference with higher confidence
        const existing = references.get(upperKey);
        if (existing && existing.confidence >= baseConfidence) {
          continue;
        }

        references.set(upperKey, {
          key: upperKey,
          source,
          rawMatch: match[0],
          confidence: baseConfidence,
        });
      }
    }
  }

  private async fetchJiraTicket(key: string): Promise<JiraApiIssue | null> {
    if (this.config.useMcp && this.mcpCallback) {
      // Use MCP to fetch ticket
      // The MCP server should have a tool for fetching individual issues
      try {
        const result = await this.mcpCallback('atlassian:get-issue', {
          issueKey: key,
        });
        return result as JiraApiIssue;
      } catch {
        // If specific tool not available, try search
        const searchResult = await this.mcpCallback('atlassian:search-company-knowledge', {
          query: `key:${key}`,
          limit: 1,
        });
        if (Array.isArray(searchResult) && searchResult.length > 0) {
          return searchResult[0] as JiraApiIssue;
        }
      }
    }

    // Direct API fetch
    const response = await this.fetchJiraApi(`/rest/api/3/issue/${key}?expand=renderedFields`);
    if (response.ok) {
      return response.json() as Promise<JiraApiIssue>;
    }
    return null;
  }

  private async fetchJiraApi(path: string): Promise<Response> {
    if (!this.config.instanceUrl || !this.config.email || !this.config.apiToken) {
      throw new Error('Jira API credentials not configured');
    }

    const url = `${this.config.instanceUrl}${path}`;
    const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');

    return fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    });
  }

  private normalizeTicket(raw: JiraApiIssue): IssueTicket {
    const fields = raw.fields || {};

    // Extract acceptance criteria from description or custom field
    const acceptanceCriteria = this.extractAcceptanceCriteria(fields);

    // Normalize issue type
    const issueType = this.normalizeIssueType(fields.issuetype?.name);

    // Normalize priority
    const priority = this.normalizePriority(fields.priority?.name);

    // Extract linked issues
    const linkedIssues = this.extractLinkedIssues(fields);

    // Extract subtasks
    const subtasks = this.extractSubtasks(fields);

    // Check for visual documentation
    const attachments = fields.attachment || [];
    const hasScreenshots = attachments.some((a: JiraApiAttachment) =>
      a.mimeType?.startsWith('image/')
    );
    const hasDiagrams = attachments.some(
      (a: JiraApiAttachment) =>
        a.filename?.includes('diagram') ||
        a.filename?.includes('flow') ||
        a.mimeType?.includes('svg')
    );

    // Extract epic key - handle custom field which may be string or undefined
    const epicKey = fields.epic?.key || (fields.customfield_10014 as string | undefined);

    return {
      id: raw.id,
      key: raw.key,
      url: `${this.config.instanceUrl || ''}/browse/${raw.key}`,
      title: fields.summary || '',
      description: this.extractDescription(fields),
      type: issueType,
      status: fields.status?.name || 'Unknown',
      priority,
      assignee: fields.assignee?.displayName,
      reporter: fields.reporter?.displayName,
      labels: fields.labels || [],
      components: (fields.components || []).map((c: { name: string }) => c.name),
      project: fields.project?.key,
      storyPoints: this.extractStoryPoints(fields),
      acceptanceCriteria: acceptanceCriteria.text,
      acceptanceCriteriaList: acceptanceCriteria.list,
      testScenarios: this.extractTestScenarios(fields),
      linkedTestCases: [], // Would need Zephyr/Xray integration
      hasScreenshots,
      hasDiagrams,
      attachmentCount: attachments.length,
      parentKey: fields.parent?.key,
      epicKey,
      linkedIssues,
      subtasks,
      createdAt: fields.created || '',
      updatedAt: fields.updated || '',
      rawData: raw as unknown as Record<string, unknown>,
    };
  }

  private extractDescription(fields: JiraApiFields): string {
    // Handle Atlassian Document Format (ADF) or plain text
    if (typeof fields.description === 'string') {
      return fields.description;
    }
    if (fields.description?.content) {
      return this.adfToText(fields.description);
    }
    return '';
  }

  private adfToText(adf: JiraAdfDocument): string {
    // Simple ADF to text conversion
    const extractText = (node: JiraAdfNode): string => {
      if (node.type === 'text') {
        return node.text || '';
      }
      if (node.content) {
        return node.content.map(extractText).join('');
      }
      return '';
    };

    return (adf.content || [])
      .map((node) => {
        const text = extractText(node);
        // Add newlines for block elements
        if (['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem'].includes(node.type)) {
          return text + '\n';
        }
        return text;
      })
      .join('')
      .trim();
  }

  private extractAcceptanceCriteria(fields: JiraApiFields): {
    text: string;
    list: string[];
  } {
    // Try custom field first
    if (this.config.acceptanceCriteriaField) {
      const customField = fields[this.config.acceptanceCriteriaField];
      if (customField) {
        let text: string;
        if (typeof customField === 'string') {
          text = customField;
        } else if (typeof customField === 'object' && customField !== null && 'type' in customField && 'version' in customField) {
          text = this.adfToText(customField as JiraAdfDocument);
        } else {
          text = '';
        }
        return { text, list: this.parseAcceptanceCriteriaList(text) };
      }
    }

    // Extract from description - look for common AC patterns
    const description = this.extractDescription(fields);
    const acPatterns = [
      /acceptance\s*criteria[:\s]*\n([\s\S]*?)(?=\n\n|\n#|$)/i,
      /definition\s*of\s*done[:\s]*\n([\s\S]*?)(?=\n\n|\n#|$)/i,
      /requirements[:\s]*\n([\s\S]*?)(?=\n\n|\n#|$)/i,
      /given[\s\S]*?when[\s\S]*?then/gi, // Gherkin-style
    ];

    for (const pattern of acPatterns) {
      const match = description.match(pattern);
      if (match) {
        const text = match[1] || match[0];
        return { text, list: this.parseAcceptanceCriteriaList(text) };
      }
    }

    return { text: '', list: [] };
  }

  private parseAcceptanceCriteriaList(text: string): string[] {
    const items: string[] = [];

    // Parse bullet points
    const bulletMatches = text.match(/^[\s]*[-*•]\s*(.+)$/gm);
    if (bulletMatches) {
      items.push(...bulletMatches.map((m) => m.replace(/^[\s]*[-*•]\s*/, '').trim()));
    }

    // Parse numbered items
    const numberedMatches = text.match(/^[\s]*\d+[.)]\s*(.+)$/gm);
    if (numberedMatches) {
      items.push(...numberedMatches.map((m) => m.replace(/^[\s]*\d+[.)]\s*/, '').trim()));
    }

    // Parse checkboxes
    const checkboxMatches = text.match(/^[\s]*\[[ x]\]\s*(.+)$/gim);
    if (checkboxMatches) {
      items.push(...checkboxMatches.map((m) => m.replace(/^[\s]*\[[ x]\]\s*/i, '').trim()));
    }

    // If no structured items found, split by newlines
    if (items.length === 0 && text.trim()) {
      const lines = text.split('\n').filter((l) => l.trim().length > 10);
      items.push(...lines.map((l) => l.trim()));
    }

    return [...new Set(items)]; // Remove duplicates
  }

  private extractStoryPoints(fields: JiraApiFields): number | undefined {
    // Try common story point field IDs
    const spFields = [
      this.config.storyPointsField,
      'customfield_10016', // Common Jira Cloud
      'customfield_10004', // Another common one
      'storyPoints',
    ].filter(Boolean);

    for (const field of spFields) {
      if (field && fields[field] !== undefined) {
        const value = fields[field];
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value) || undefined;
      }
    }
    return undefined;
  }

  private extractTestScenarios(fields: JiraApiFields): string[] {
    const description = this.extractDescription(fields);
    const scenarios: string[] = [];

    // Look for test scenario patterns
    const testPatterns = [
      /test\s*scenario[s]?[:\s]*\n([\s\S]*?)(?=\n\n|\n#|$)/i,
      /test\s*cases?[:\s]*\n([\s\S]*?)(?=\n\n|\n#|$)/i,
      /scenario[:\s]+(.+)/gi,
    ];

    for (const pattern of testPatterns) {
      const matches = description.match(pattern);
      if (matches) {
        scenarios.push(...this.parseAcceptanceCriteriaList(matches[1] || matches[0]));
      }
    }

    return [...new Set(scenarios)];
  }

  private normalizeIssueType(typeName?: string): IssueType {
    if (!typeName) return 'other';
    const lower = typeName.toLowerCase();
    if (lower.includes('bug')) return 'bug';
    if (lower.includes('feature')) return 'feature';
    if (lower.includes('story')) return 'story';
    if (lower.includes('epic')) return 'epic';
    if (lower.includes('subtask') || lower.includes('sub-task')) return 'subtask';
    if (lower.includes('task')) return 'task';
    if (lower.includes('improvement')) return 'improvement';
    if (lower.includes('spike')) return 'spike';
    return 'other';
  }

  private normalizePriority(priorityName?: string): IssuePriority {
    if (!priorityName) return 'none';
    const lower = priorityName.toLowerCase();
    if (lower.includes('critical') || lower.includes('blocker') || lower.includes('highest')) {
      return 'critical';
    }
    if (lower.includes('high')) return 'high';
    if (lower.includes('medium') || lower.includes('normal')) return 'medium';
    if (lower.includes('low') || lower.includes('minor')) return 'low';
    return 'none';
  }

  private extractLinkedIssues(fields: JiraApiFields): LinkedIssue[] {
    const links = fields.issuelinks || [];
    return links.map((link: JiraApiIssueLink) => {
      const linkedIssue = link.inwardIssue || link.outwardIssue;
      const linkType = link.inwardIssue ? link.type?.inward : link.type?.outward;
      return {
        key: linkedIssue?.key || '',
        type: linkType || 'relates to',
        title: linkedIssue?.fields?.summary || '',
        status: linkedIssue?.fields?.status?.name || '',
      };
    });
  }

  private extractSubtasks(fields: JiraApiFields): SubtaskInfo[] {
    const subtasks = fields.subtasks || [];
    return subtasks.map((st: JiraApiSubtask) => ({
      key: st.key,
      title: st.fields?.summary || '',
      status: st.fields?.status?.name || '',
    }));
  }
}

// ========== Jira API Types ==========

interface JiraApiIssue {
  id: string;
  key: string;
  fields: JiraApiFields;
}

interface JiraApiFields {
  summary?: string;
  description?: string | JiraAdfDocument;
  issuetype?: { name: string };
  status?: { name: string };
  priority?: { name: string };
  assignee?: { displayName: string };
  reporter?: { displayName: string };
  labels?: string[];
  components?: Array<{ name: string }>;
  project?: { key: string };
  parent?: { key: string };
  epic?: { key: string };
  created?: string;
  updated?: string;
  attachment?: JiraApiAttachment[];
  issuelinks?: JiraApiIssueLink[];
  subtasks?: JiraApiSubtask[];
  [key: string]: unknown; // Custom fields
}

interface JiraAdfDocument {
  type: string;
  version: number;
  content?: JiraAdfNode[];
}

interface JiraAdfNode {
  type: string;
  text?: string;
  content?: JiraAdfNode[];
}

interface JiraApiAttachment {
  id: string;
  filename: string;
  mimeType: string;
}

interface JiraApiIssueLink {
  type?: { inward: string; outward: string };
  inwardIssue?: { key: string; fields?: { summary?: string; status?: { name: string } } };
  outwardIssue?: { key: string; fields?: { summary?: string; status?: { name: string } } };
}

interface JiraApiSubtask {
  key: string;
  fields?: { summary?: string; status?: { name: string } };
}

interface JiraApiComment {
  id: string;
  author?: { displayName: string };
  body?: string | JiraAdfDocument;
  created: string;
}
