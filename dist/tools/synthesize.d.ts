/**
 * Synthesize findings tool - synthesizes all analyzed files
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import type { ToolContext } from './types';
export declare function createSynthesizeTool(context: ToolContext): DynamicStructuredTool;
