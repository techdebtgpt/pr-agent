#!/usr/bin/env node

/**
 * PR Agent MCP Server
 *
 * Modular MCP server following SOLID principles and separation of concerns.
 * This file serves as the entry point and tool registration layer only.
 * All business logic is delegated to specialized service classes.
 *
 * Architecture:
 * - server.ts (this file): Tool registration and MCP protocol handling
 * - services/: Stateless service classes (git, diff parsing, formatting, etc.)
 * - tools/: Tool handler classes (one per MCP tool)
 * - constants.ts: Centralized configuration and messages
 * - types.ts: MCP-specific type definitions
 *
 * The calling LLM (Claude Code, Cursor, etc.) provides AI-powered insights
 * after receiving the analysis response.
 *
 * Note: When Claude Code adds MCP sampling support (Issue #1785),
 * the StubChatModel can be replaced with MCPChatModel for true pass-through LLM access.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// __dirname workaround for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import service classes and tool handlers
import { DashboardService } from './services/index.js';
import { AnalyzeTool, SaveResultsTool, DashboardTool } from './tools/index.js';
import {
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  TOOL_DESCRIPTIONS,
  TOOL_SCHEMAS,
} from './constants.js';

// Create MCP server
const server = new McpServer({
  name: MCP_SERVER_NAME,
  version: MCP_SERVER_VERSION,
});

// Initialize shared services
const dashboardService = new DashboardService();

// Initialize tool handlers with dependencies
const analyzeTool = new AnalyzeTool(dashboardService);
const saveResultsTool = new SaveResultsTool();
const dashboardTool = new DashboardTool(dashboardService);

/**
 * analyze - Main PR analysis tool (mirrors CLI 'pr-agent analyze' command)
 *
 * Returns analysis prompts that the calling LLM MUST automatically execute.
 * Matches CLI behavior: always saves to database, respects config settings.
 */
server.tool(
  'analyze',
  TOOL_DESCRIPTIONS.ANALYZE,
  TOOL_SCHEMAS.ANALYZE,
  async (args) => {
    return await analyzeTool.execute(args);
  }
);

/**
 * saveAnalysisResults - Save analysis results to database after LLM execution
 * Called by the LLM after executing the prompts returned by analyze tool
 */
server.tool(
  'saveAnalysisResults',
  TOOL_DESCRIPTIONS.SAVE_RESULTS,
  TOOL_SCHEMAS.SAVE_RESULTS,
  async (args) => {
    return await saveResultsTool.execute(args);
  }
);

/**
 * dashboard - Start the web dashboard (same as CLI 'pr-agent dashboard')
 */
server.tool(
  'dashboard',
  TOOL_DESCRIPTIONS.DASHBOARD,
  TOOL_SCHEMAS.DASHBOARD,
  async (args) => {
    return await dashboardTool.execute(args, __dirname);
  }
);

// Main entry point
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PR Agent MCP Server started - LLM-agnostic mode with PROMPT_ONLY');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
