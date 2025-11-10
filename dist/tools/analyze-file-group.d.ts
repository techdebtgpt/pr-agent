/**
 * Analyze file group tool - analyzes multiple files together
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import type { ToolContext } from './types';
export declare function createAnalyzeFileGroupTool(context: ToolContext): DynamicStructuredTool;
