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
export {};
