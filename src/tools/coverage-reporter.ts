/**
 * Coverage Reporter Tool for PR Analysis
 * Reads coverage reports and extracts metrics when coverage tool is configured
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { CoverageReport } from '../types/agent.types.js';

// Common coverage file locations
const COVERAGE_PATHS = {
    jest: ['coverage/coverage-summary.json', 'coverage/lcov.info', 'coverage/coverage-final.json'],
    nyc: ['coverage/coverage-summary.json', '.nyc_output/coverage.json', 'coverage/lcov.info'],
    vitest: ['coverage/coverage-summary.json', 'coverage/lcov.info'],
    pytest: ['coverage.xml', 'htmlcov/coverage.json', '.coverage'],
    generic: ['coverage.json', 'coverage/lcov.info', 'coverage.xml'],
};

/**
 * Detect if coverage tool is configured in the project
 */
export function detectCoverageTool(repoPath: string = '.'): {
    tool: string | null;
    configured: boolean;
    coveragePath?: string;
} {
    const packageJsonPath = path.join(repoPath, 'package.json');

    // Check for Node.js project with coverage config
    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

            // Check Jest config
            if (packageJson.jest?.collectCoverage || packageJson.jest?.coverageDirectory) {
                return { tool: 'jest', configured: true };
            }

            // Check for coverage scripts
            const scripts = packageJson.scripts || {};
            const hasCoverageScript = Object.values(scripts).some((script: unknown) =>
                typeof script === 'string' && (script.includes('--coverage') || script.includes('nyc'))
            );

            if (hasCoverageScript) {
                // Determine which tool
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                if (deps.jest) return { tool: 'jest', configured: true };
                if (deps.nyc || deps['istanbul']) return { tool: 'nyc', configured: true };
                if (deps.vitest) return { tool: 'vitest', configured: true };
                if (deps.c8) return { tool: 'c8', configured: true };
                return { tool: 'node', configured: true };
            }
        } catch (e) {
            // Ignore parse errors
        }
    }

    // Check for Jest config file
    if (fs.existsSync(path.join(repoPath, 'jest.config.js')) || fs.existsSync(path.join(repoPath, 'jest.config.ts'))) {
        try {
            const configPath = fs.existsSync(path.join(repoPath, 'jest.config.js'))
                ? path.join(repoPath, 'jest.config.js')
                : path.join(repoPath, 'jest.config.ts');
            const content = fs.readFileSync(configPath, 'utf-8');
            if (content.includes('collectCoverage') || content.includes('coverageDirectory')) {
                return { tool: 'jest', configured: true };
            }
        } catch (e) {
            // Ignore read errors
        }
    }

    // Check for Python coverage
    const setupCfg = path.join(repoPath, 'setup.cfg');
    const pyprojectToml = path.join(repoPath, 'pyproject.toml');

    if (fs.existsSync(setupCfg)) {
        try {
            const content = fs.readFileSync(setupCfg, 'utf-8');
            if (content.includes('[coverage:') || content.includes('coverage')) {
                return { tool: 'pytest-cov', configured: true };
            }
        } catch (e) {
            // Ignore read errors
        }
    }

    if (fs.existsSync(pyprojectToml)) {
        try {
            const content = fs.readFileSync(pyprojectToml, 'utf-8');
            if (content.includes('[tool.coverage]') || content.includes('pytest-cov')) {
                return { tool: 'pytest-cov', configured: true };
            }
        } catch (e) {
            // Ignore read errors
        }
    }

    return { tool: null, configured: false };
}

/**
 * Find existing coverage report files
 */
export function findCoverageFiles(repoPath: string = '.'): string[] {
    const foundFiles: string[] = [];

    for (const paths of Object.values(COVERAGE_PATHS)) {
        for (const coveragePath of paths) {
            const fullPath = path.join(repoPath, coveragePath);
            if (fs.existsSync(fullPath)) {
                foundFiles.push(fullPath);
            }
        }
    }

    return [...new Set(foundFiles)]; // Remove duplicates
}

/**
 * Parse Jest/NYC coverage-summary.json format
 */
function parseJestCoverageSummary(filePath: string): CoverageReport | null {
    try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const total = content.total;

        if (!total) return null;

        const fileBreakdown: CoverageReport['fileBreakdown'] = [];

        for (const [file, data] of Object.entries(content)) {
            if (file === 'total') continue;
            const fileData = data as { lines?: { pct: number }; branches?: { pct: number } };
            fileBreakdown.push({
                file,
                lineCoverage: fileData.lines?.pct || 0,
                branchCoverage: fileData.branches?.pct,
            });
        }

        return {
            available: true,
            overallPercentage: total.lines?.pct || total.statements?.pct || 0,
            lineCoverage: total.lines?.pct,
            branchCoverage: total.branches?.pct,
            fileBreakdown: fileBreakdown.slice(0, 20), // Limit to 20 files
            coverageTool: 'jest/nyc',
        };
    } catch (e) {
        return null;
    }
}

/**
 * Parse LCOV format
 */
function parseLcov(filePath: string): CoverageReport | null {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const files: Array<{ file: string; linesHit: number; linesTotal: number }> = [];
        let currentFile = '';
        let linesHit = 0;
        let linesTotal = 0;

        for (const line of content.split('\n')) {
            if (line.startsWith('SF:')) {
                currentFile = line.substring(3);
                linesHit = 0;
                linesTotal = 0;
            } else if (line.startsWith('LH:')) {
                linesHit = parseInt(line.substring(3), 10);
            } else if (line.startsWith('LF:')) {
                linesTotal = parseInt(line.substring(3), 10);
            } else if (line === 'end_of_record' && currentFile) {
                files.push({ file: currentFile, linesHit, linesTotal });
                currentFile = '';
            }
        }

        const totalHit = files.reduce((sum, f) => sum + f.linesHit, 0);
        const totalLines = files.reduce((sum, f) => sum + f.linesTotal, 0);
        const overallPercentage = totalLines > 0 ? (totalHit / totalLines) * 100 : 0;

        return {
            available: true,
            overallPercentage: Math.round(overallPercentage * 100) / 100,
            lineCoverage: overallPercentage,
            fileBreakdown: files.slice(0, 20).map(f => ({
                file: f.file,
                lineCoverage: f.linesTotal > 0 ? (f.linesHit / f.linesTotal) * 100 : 0,
            })),
            coverageTool: 'lcov',
        };
    } catch (e) {
        return null;
    }
}

/**
 * Parse Cobertura XML format
 */
function parseCobertura(filePath: string): CoverageReport | null {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Simple regex parsing for line-rate attribute
        const lineRateMatch = content.match(/line-rate="([0-9.]+)"/);
        const branchRateMatch = content.match(/branch-rate="([0-9.]+)"/);

        if (!lineRateMatch) return null;

        const lineRate = parseFloat(lineRateMatch[1]) * 100;
        const branchRate = branchRateMatch ? parseFloat(branchRateMatch[1]) * 100 : undefined;

        return {
            available: true,
            overallPercentage: Math.round(lineRate * 100) / 100,
            lineCoverage: lineRate,
            branchCoverage: branchRate,
            coverageTool: 'cobertura',
        };
    } catch (e) {
        return null;
    }
}

/**
 * Read and parse coverage report
 */
export function readCoverageReport(repoPath: string = '.'): CoverageReport {
    const coverageFiles = findCoverageFiles(repoPath);

    if (coverageFiles.length === 0) {
        return { available: false };
    }

    // Try to parse each file type
    for (const filePath of coverageFiles) {
        const fileName = path.basename(filePath);

        if (fileName === 'coverage-summary.json' || fileName === 'coverage.json') {
            const report = parseJestCoverageSummary(filePath);
            if (report) return report;
        }

        if (fileName === 'lcov.info' || fileName.endsWith('.lcov')) {
            const report = parseLcov(filePath);
            if (report) return report;
        }

        if (fileName === 'coverage.xml' || fileName.endsWith('cobertura.xml')) {
            const report = parseCobertura(filePath);
            if (report) return report;
        }
    }

    return { available: false };
}

/**
 * Create coverage reporter tool
 */
export function createCoverageReporterTool() {
    return new DynamicStructuredTool({
        name: 'report_coverage',
        description: 'Read test coverage reports and extract metrics (only if coverage tool is configured)',
        schema: z.object({
            repoPath: z.string().optional().describe('Repository path to check for coverage'),
            forceRead: z.boolean().optional().describe('Force reading coverage even if not configured'),
        }),
        func: async ({ repoPath, forceRead }: { repoPath?: string; forceRead?: boolean }) => {
            const projectPath = repoPath || '.';

            // Check if coverage tool is configured
            const toolConfig = detectCoverageTool(projectPath);

            if (!toolConfig.configured && !forceRead) {
                return JSON.stringify({
                    available: false,
                    reason: 'No coverage tool configured in project',
                    configured: false,
                });
            }

            // Try to read coverage report
            const report = readCoverageReport(projectPath);

            return JSON.stringify({
                ...report,
                configured: toolConfig.configured,
                tool: toolConfig.tool,
            });
        },
    });
}

/**
 * Format coverage report for display
 */
export function formatCoverageReport(report: CoverageReport): string {
    if (!report.available) {
        return 'No coverage data available';
    }

    let output = '';

    if (report.overallPercentage !== undefined) {
        const emoji = report.overallPercentage >= 80 ? '🟢' : report.overallPercentage >= 60 ? '🟡' : '🔴';
        output += `${emoji} Overall Coverage: ${report.overallPercentage.toFixed(1)}%\n`;
    }

    if (report.lineCoverage !== undefined) {
        output += `  Lines: ${report.lineCoverage.toFixed(1)}%\n`;
    }

    if (report.branchCoverage !== undefined) {
        output += `  Branches: ${report.branchCoverage.toFixed(1)}%\n`;
    }

    if (report.delta !== undefined) {
        const deltaEmoji = report.delta >= 0 ? '📈' : '📉';
        output += `${deltaEmoji} Coverage Delta: ${report.delta >= 0 ? '+' : ''}${report.delta.toFixed(1)}%\n`;
    }

    if (report.fileBreakdown && report.fileBreakdown.length > 0) {
        output += '\nFile Breakdown:\n';
        for (const file of report.fileBreakdown.slice(0, 10)) {
            const emoji = file.lineCoverage >= 80 ? '✅' : file.lineCoverage >= 60 ? '⚠️' : '❌';
            output += `  ${emoji} ${path.basename(file.file)}: ${file.lineCoverage.toFixed(1)}%\n`;
        }
        if (report.fileBreakdown.length > 10) {
            output += `  ... and ${report.fileBreakdown.length - 10} more files\n`;
        }
    }

    return output;
}
