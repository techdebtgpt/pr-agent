/**
 * LangChain Tools for PR Analysis Agent
 * Main entry point - assembles all tools from separate modules
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import type { ToolContext } from './tools/types';
export type { ToolContext };
/**
 * Create all LangChain tools for the PR analysis agent
 */
export declare function createLangChainTools(context: ToolContext): DynamicStructuredTool[];
