/**
 * Check imports tool - checks imports and usages
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import type { ToolContext } from './types';
export declare function createCheckImportsTool(context: ToolContext): DynamicStructuredTool | null;
