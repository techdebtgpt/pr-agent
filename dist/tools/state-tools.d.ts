/**
 * State tools - get current state and remaining files
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import type { ToolContext } from './types';
export declare function createStateTools(context: ToolContext): DynamicStructuredTool[];
