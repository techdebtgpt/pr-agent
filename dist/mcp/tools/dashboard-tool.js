/**
 * Dashboard Tool Handler
 * Handles the 'dashboard' MCP tool
 * Single Responsibility: Start/manage dashboard server
 */
import { ERROR_MESSAGES, DEFAULT_DASHBOARD_PORT } from '../constants.js';
export class DashboardTool {
    dashboardService;
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    async execute(args, dirname) {
        const targetPort = args.port || DEFAULT_DASHBOARD_PORT;
        // Check if already running on this port
        if (this.dashboardService.isRunningOnPort(targetPort)) {
            return {
                content: [
                    {
                        type: 'text',
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
                        type: 'text',
                        text: `✅ Dashboard started successfully!\n\n📊 Access at: http://localhost:${targetPort}\n\nView PR analysis history, statistics, and insights.`,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to start dashboard: ${error.message}`,
                    },
                ],
            };
        }
    }
}
//# sourceMappingURL=dashboard-tool.js.map