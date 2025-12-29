/**
 * Issue Tracker Module
 *
 * Provides integration with issue tracking systems (Jira, Linear, etc.)
 * for context-aware PR reviews.
 */

// Types
export * from '../types/issue-tracker.types.js';

// Jira Client
export { JiraMcpClient, type JiraConfig } from './jira-mcp-client.js';

// Integration
export {
  PeerReviewIntegration,
  createPeerReviewIntegration,
  formatPeerReviewOutput,
  formatPeerReviewMarkdown,
  type PeerReviewConfig,
  type PeerReviewContext,
  type PeerReviewResult,
  type PeerReviewUserConfig,
} from './peer-review-integration.js';

// Sub-Agent
export {
  JiraSubAgent,
  type JiraSubAgentResult,
  type JiraSubAgentContext,
  type TicketQualityRating,
  type AcceptanceCriteriaValidation,
  type PeerReviewAnalysis,
} from '../agents/jira-sub-agent.js';
