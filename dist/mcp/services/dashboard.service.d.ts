/**
 * Dashboard Service
 * Manages the HTTP dashboard server
 * Single Responsibility: Dashboard server lifecycle
 */
import type { DashboardServerState } from '../types.js';
export declare class DashboardService {
    private state;
    /**
     * Get current server state
     */
    getState(): DashboardServerState;
    /**
     * Check if dashboard is running
     */
    isRunning(): boolean;
    /**
     * Check if dashboard is running on specific port
     */
    isRunningOnPort(port: number): boolean;
    /**
     * Start dashboard server
     * @throws Error if server fails to start
     */
    start(port: number, dirname: string): Promise<void>;
    /**
     * Stop dashboard server
     */
    stop(): void;
    /**
     * Start dashboard in background (non-blocking, swallow errors)
     */
    startInBackground(port: number, dirname: string): Promise<void>;
}
