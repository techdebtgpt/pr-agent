/**
 * Analyze Tool Handler
 * Handles the 'analyze' MCP tool
 * Single Responsibility: Orchestrate PR analysis workflow
 */
import type { McpToolResponse } from '../types.js';
import { DashboardService } from '../services/index.js';
export interface AnalyzeToolArgs {
    branch?: string;
    staged?: boolean;
    title?: string;
    cwd?: string;
    verbose?: boolean;
    archDocs?: boolean;
}
export declare class AnalyzeTool {
    private dashboardService;
    constructor(dashboardService: DashboardService);
    execute(args: AnalyzeToolArgs): Promise<McpToolResponse>;
}
