/**
 * Dashboard Service
 * Manages the HTTP dashboard server
 * Single Responsibility: Dashboard server lifecycle
 */
import express from 'express';
import path from 'path';
import * as fs from 'fs';
import { getDashboardStats, getRecentAnalyses } from '../../db/index.js';
import { DASHBOARD_API_STATS_PATH, DASHBOARD_CATCH_ALL_PATH, ERROR_MESSAGES, SUCCESS_MESSAGES, } from '../constants.js';
export class DashboardService {
    state = {
        httpServer: null,
        port: null,
    };
    /**
     * Get current server state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Check if dashboard is running
     */
    isRunning() {
        return this.state.httpServer !== null && this.state.port !== null;
    }
    /**
     * Check if dashboard is running on specific port
     */
    isRunningOnPort(port) {
        return this.isRunning() && this.state.port === port;
    }
    /**
     * Start dashboard server
     * @throws Error if server fails to start
     */
    async start(port, dirname) {
        // If already running on this port, do nothing
        if (this.isRunningOnPort(port)) {
            return;
        }
        // Stop existing server if running on different port
        if (this.isRunning()) {
            this.stop();
        }
        return new Promise((resolve, reject) => {
            const app = express();
            // Resolve public directory
            const publicDir = path.resolve(dirname, '../public');
            const srcPublicDir = path.resolve(dirname, '../../src/public');
            const staticDir = fs.existsSync(publicDir) ? publicDir : srcPublicDir;
            app.use(express.static(staticDir));
            // API Routes
            app.get(DASHBOARD_API_STATS_PATH, (req, res) => {
                try {
                    const stats = getDashboardStats();
                    const recent = getRecentAnalyses();
                    res.json({ stats, recent });
                }
                catch (error) {
                    res.status(500).json({ error: 'Failed to fetch stats' });
                }
            });
            app.get(DASHBOARD_CATCH_ALL_PATH, (req, res) => {
                res.sendFile(path.join(staticDir, 'index.html'));
            });
            const httpServer = app.listen(port, () => {
                this.state.httpServer = httpServer;
                this.state.port = port;
                console.error(SUCCESS_MESSAGES.DASHBOARD_STARTED(port));
                // Open browser
                import('open')
                    .then((openModule) => {
                    openModule.default(`http://localhost:${port}`).catch((err) => {
                        console.error('[MCP Server] Could not open browser:', err.message);
                    });
                })
                    .catch((err) => {
                    console.error('[MCP Server] Could not import open module:', err.message);
                });
                resolve();
            });
            httpServer.on('error', (err) => {
                reject(new Error(err.code === 'EADDRINUSE'
                    ? ERROR_MESSAGES.DASHBOARD_PORT_IN_USE(port)
                    : ERROR_MESSAGES.DASHBOARD_START_FAILED(err.message)));
            });
        });
    }
    /**
     * Stop dashboard server
     */
    stop() {
        if (this.state.httpServer) {
            this.state.httpServer.close();
            this.state.httpServer = null;
            this.state.port = null;
        }
    }
    /**
     * Start dashboard in background (non-blocking, swallow errors)
     */
    async startInBackground(port, dirname) {
        try {
            await this.start(port, dirname);
        }
        catch (error) {
            console.error('[MCP Server] Failed to start dashboard:', error.message);
            // Don't throw - background operation should not block analysis
        }
    }
}
//# sourceMappingURL=dashboard.service.js.map