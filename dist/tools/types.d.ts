/**
 * Tool context types
 */
import { ChatAnthropic } from '@langchain/anthropic';
import type { DiffFile, AgentState } from '../pr-agent';
import type { BaseAIProvider } from '../providers/base';
export interface ToolContext {
    state: AgentState;
    llm: ChatAnthropic;
    provider: BaseAIProvider;
    githubApi?: any;
    repository?: {
        owner: string;
        repo: string;
        baseSha?: string;
        headSha?: string;
    };
    getFileContent: (filePath: string, ref?: string) => string | null;
    getDeletedFileContent: (filePath: string, ref?: string) => string | null;
    calculatePriorityScore: (file: DiffFile, state: AgentState) => number;
}
