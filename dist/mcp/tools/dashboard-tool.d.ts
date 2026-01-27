/**
 * Dashboard Tool Handler
 * Handles the 'dashboard' MCP tool
 * Single Responsibility: Start/manage dashboard server
 */
import type { McpToolResponse } from '../types.js';
import { DashboardService } from '../services/index.js';
export interface DashboardToolArgs {
    port?: number;
}
export declare class DashboardTool {
    private dashboardService;
    constructor(dashboardService: DashboardService);
    execute(args: DashboardToolArgs, dirname: string): Promise<McpToolResponse>;
}
