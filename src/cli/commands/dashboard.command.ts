import { Command } from 'commander';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';
import chalk from 'chalk';
import { getDashboardStats, getRecentAnalyses } from '../../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerDashboardCommand(program: Command) {
    program
        .command('dashboard')
        .description('Open the local analysis dashboard')
        .option('-p, --port <number>', 'Port to run the dashboard on', '3000')
        .action(async (options) => {
            const port = parseInt(options.port, 10);
            const app = express();
            
            // Serve static files from the public directory
            // We need to resolve from dist/cli/commands/ to src/public or dist/public
            // Assuming the build copies public to dist/public
            const publicDir = path.resolve(__dirname, '../../public');
            
            // Fallback for development (running from src)
            const srcPublicDir = path.resolve(__dirname, '../../../src/public');
            
            if (process.env.NODE_ENV === 'development') {
                app.use(express.static(srcPublicDir));
            } else {
                 // In production (dist), public might not be copied by tsc, so check
                 app.use(express.static(srcPublicDir));
            }

            // API Routes
            app.get('/dashboard/api/stats', (req, res) => {
                try {
                    const stats = getDashboardStats();
                    const recent = getRecentAnalyses();
                    res.json({ stats, recent });
                } catch (error) {
                    console.error('Error fetching stats:', error);
                    res.status(500).json({ error: 'Failed to fetch stats' });
                }
            });

            // Serve index.html for all other routes (must be last)
            app.get('/', (req, res) => {
                res.sendFile(path.join(srcPublicDir, 'index.html'));
            });

            app.listen(port, async () => {
                const url = `http://localhost:${port}`;
                console.log(chalk.green(`Dashboard running at ${url}`));
                
                try {
                    await open(url);
                } catch (err) {
                    console.log(chalk.yellow(`Could not open browser automatically. Please visit ${url}`));
                }
            });
        });
}
