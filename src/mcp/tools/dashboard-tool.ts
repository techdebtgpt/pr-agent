/**
 * Dashboard Tool Handler
 * Handles the 'dashboard' MCP tool
 * Single Responsibility: Start/manage dashboard server
 */

import type { McpToolResponse } from '../types.js';
import { DashboardService } from '../services/index.js';
import { ERROR_MESSAGES, DEFAULT_DASHBOARD_PORT } from '../constants.js';

export interface DashboardToolArgs {
  port?: number;
}

export class DashboardTool {
  private dashboardService: DashboardService;

  constructor(dashboardService: DashboardService) {
    this.dashboardService = dashboardService;
  }

  async execute(args: DashboardToolArgs, dirname: string): Promise<McpToolResponse> {
    const targetPort = args.port || DEFAULT_DASHBOARD_PORT;

    // Check if already running on this port
    if (this.dashboardService.isRunningOnPort(targetPort)) {
      return {
        content: [
          {
            type: 'text' as const,
            text: ERROR_MESSAGES.DASHBOARD_ALREADY_RUNNING(targetPort),
          },
        ],
      };
    }

    try {
      await this.dashboardService.start(targetPort, dirname);

      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Dashboard started successfully!\n\n📊 Access at: http://localhost:${targetPort}\n\nView PR analysis history, statistics, and insights.`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Failed to start dashboard: ${error.message}`,
          },
        ],
      };
    }
  }
}
