/**
 * PR Analysis Agent
 * Simplified wrapper around PRAnalyzerAgent for backward compatibility
 */

export { PRAnalyzerAgent } from './agents/pr-analyzer-agent.js';

// Export types from agent.types
export type {
  DiffFile,
  AnalysisMode,
  AgentAnalysisResult,
  FileAnalysis,
  AgentContext,
  AgentResult,
  AgentMetadata,
} from './types/agent.types.js';

// Backward compatibility alias
export { PRAnalyzerAgent as PRAgent } from './agents/pr-analyzer-agent.js';
export { PRAnalyzerAgent as PRAnalysisAgent } from './agents/pr-analyzer-agent.js';