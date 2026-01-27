/**
 * Coverage Analyzer Tool for PR Analysis
 * Integrates Istanbul/nyc coverage data and ESLint static analysis 
 * to provide coverage-based test suggestions
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// ========== Types ==========

export interface CoverageMetrics {
    statements: { covered: number; total: number; pct: number };
    branches: { covered: number; total: number; pct: number };
    functions: { covered: number; total: number; pct: number };
    lines: { covered: number; total: number; pct: number };
}

export interface FileCoverage {
    path: string;
    metrics: CoverageMetrics;
    uncoveredLines: number[];
    uncoveredBranches: string[];
    uncoveredFunctions: string[];
}

export interface UncoveredCode {
    filePath: string;
    functionName?: string;
    lineRange: { start: number; end: number };
    type: 'function' | 'branch' | 'statement' | 'line';
    suggestion?: string;
}

export interface CoverageAnalysis {
    overall: CoverageMetrics;
    files: FileCoverage[];
    uncoveredCode: UncoveredCode[];
    timestamp: string;
    hasReport: boolean;
}

export interface StaticAnalysisIssue {
    filePath: string;
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    ruleId: string;
    message: string;
    suggestion?: string;
}

export interface StaticAnalysis {
    issues: StaticAnalysisIssue[];
    summary: {
        errors: number;
        warnings: number;
        info: number;
        fixable: number;
    };
    hasResults: boolean;
}

// ========== Coverage Report Detection ==========

/**
 * Detect if a coverage report exists and its format
 */
export function detectCoverageReport(repoPath: string = '.'): {
    found: boolean;
    format: 'lcov' | 'json' | 'clover' | 'none';
    path: string | null;
} {
    const coverageDir = path.join(repoPath, 'coverage');

    // Check for common coverage report locations
    const lcovPath = path.join(coverageDir, 'lcov.info');
    const jsonPath = path.join(coverageDir, 'coverage-final.json');
    const jsonSummaryPath = path.join(coverageDir, 'coverage-summary.json');
    const cloverPath = path.join(coverageDir, 'clover.xml');

    if (fs.existsSync(jsonSummaryPath)) {
        return { found: true, format: 'json', path: jsonSummaryPath };
    }
    if (fs.existsSync(jsonPath)) {
        return { found: true, format: 'json', path: jsonPath };
    }
    if (fs.existsSync(lcovPath)) {
        return { found: true, format: 'lcov', path: lcovPath };
    }
    if (fs.existsSync(cloverPath)) {
        return { found: true, format: 'clover', path: cloverPath };
    }

    return { found: false, format: 'none', path: null };
}

/**
 * Parse coverage-summary.json (Istanbul/nyc format)
 */
export function parseCoverageJson(reportPath: string): CoverageAnalysis {
    try {
        const content = fs.readFileSync(reportPath, 'utf-8');
        const data = JSON.parse(content);

        const files: FileCoverage[] = [];
        const uncoveredCode: UncoveredCode[] = [];

        // Extract overall metrics
        const overall = data.total ? {
            statements: {
                covered: data.total.statements?.covered || 0,
                total: data.total.statements?.total || 0,
                pct: data.total.statements?.pct || 0,
            },
            branches: {
                covered: data.total.branches?.covered || 0,
                total: data.total.branches?.total || 0,
                pct: data.total.branches?.pct || 0,
            },
            functions: {
                covered: data.total.functions?.covered || 0,
                total: data.total.functions?.total || 0,
                pct: data.total.functions?.pct || 0,
            },
            lines: {
                covered: data.total.lines?.covered || 0,
                total: data.total.lines?.total || 0,
                pct: data.total.lines?.pct || 0,
            },
        } : createEmptyMetrics();

        // Process each file
        for (const [filePath, fileData] of Object.entries(data)) {
            if (filePath === 'total') continue;

            const fd = fileData as any;
            const metrics: CoverageMetrics = {
                statements: {
                    covered: fd.statements?.covered || 0,
                    total: fd.statements?.total || 0,
                    pct: fd.statements?.pct || 0,
                },
                branches: {
                    covered: fd.branches?.covered || 0,
                    total: fd.branches?.total || 0,
                    pct: fd.branches?.pct || 0,
                },
                functions: {
                    covered: fd.functions?.covered || 0,
                    total: fd.functions?.total || 0,
                    pct: fd.functions?.pct || 0,
                },
                lines: {
                    covered: fd.lines?.covered || 0,
                    total: fd.lines?.total || 0,
                    pct: fd.lines?.pct || 0,
                },
            };

            // Identify uncovered items
            const uncoveredLines: number[] = [];
            const uncoveredBranches: string[] = [];
            const uncoveredFunctions: string[] = [];

            // For low coverage files, add to uncovered code suggestions
            if (metrics.lines.pct < 50) {
                uncoveredCode.push({
                    filePath,
                    type: 'line',
                    lineRange: { start: 1, end: metrics.lines.total },
                    suggestion: `File has ${metrics.lines.pct.toFixed(1)}% line coverage. Consider adding tests.`,
                });
            }

            if (metrics.functions.pct < 50) {
                uncoveredCode.push({
                    filePath,
                    type: 'function',
                    lineRange: { start: 1, end: 1 },
                    suggestion: `Only ${metrics.functions.covered}/${metrics.functions.total} functions are tested.`,
                });
            }

            files.push({
                path: filePath,
                metrics,
                uncoveredLines,
                uncoveredBranches,
                uncoveredFunctions,
            });
        }

        return {
            overall,
            files,
            uncoveredCode,
            timestamp: new Date().toISOString(),
            hasReport: true,
        };
    } catch (error) {
        console.error('Error parsing coverage report:', error);
        return createEmptyAnalysis();
    }
}

/**
 * Parse lcov.info format coverage report
 */
export function parseLcovReport(reportPath: string): CoverageAnalysis {
    try {
        const content = fs.readFileSync(reportPath, 'utf-8');
        const lines = content.split('\n');

        const files: FileCoverage[] = [];
        const uncoveredCode: UncoveredCode[] = [];

        let currentFile: string | null = null;
        let currentMetrics = createEmptyMetrics();
        let currentUncoveredLines: number[] = [];
        let currentUncoveredFunctions: string[] = [];

        let totalLines = { covered: 0, total: 0 };
        let totalFunctions = { covered: 0, total: 0 };
        let totalBranches = { covered: 0, total: 0 };

        for (const line of lines) {
            if (line.startsWith('SF:')) {
                // Source file
                currentFile = line.substring(3);
                currentMetrics = createEmptyMetrics();
                currentUncoveredLines = [];
                currentUncoveredFunctions = [];
            } else if (line.startsWith('DA:')) {
                // Line coverage: DA:line_number,hit_count
                const [lineNum, hitCount] = line.substring(3).split(',').map(Number);
                currentMetrics.lines.total++;
                if (hitCount > 0) {
                    currentMetrics.lines.covered++;
                } else {
                    currentUncoveredLines.push(lineNum);
                }
            } else if (line.startsWith('FN:')) {
                // Function: FN:line_number,function_name
                currentMetrics.functions.total++;
            } else if (line.startsWith('FNDA:')) {
                // Function hit data: FNDA:hit_count,function_name
                const parts = line.substring(5).split(',');
                const hitCount = parseInt(parts[0], 10);
                const funcName = parts.slice(1).join(',');
                if (hitCount > 0) {
                    currentMetrics.functions.covered++;
                } else {
                    currentUncoveredFunctions.push(funcName);
                }
            } else if (line.startsWith('BRDA:')) {
                // Branch: BRDA:line,block,branch,taken
                const parts = line.substring(5).split(',');
                currentMetrics.branches.total++;
                if (parts[3] !== '-' && parseInt(parts[3], 10) > 0) {
                    currentMetrics.branches.covered++;
                }
            } else if (line === 'end_of_record' && currentFile) {
                // Calculate percentages
                currentMetrics.lines.pct = currentMetrics.lines.total > 0
                    ? (currentMetrics.lines.covered / currentMetrics.lines.total) * 100
                    : 100;
                currentMetrics.functions.pct = currentMetrics.functions.total > 0
                    ? (currentMetrics.functions.covered / currentMetrics.functions.total) * 100
                    : 100;
                currentMetrics.branches.pct = currentMetrics.branches.total > 0
                    ? (currentMetrics.branches.covered / currentMetrics.branches.total) * 100
                    : 100;
                currentMetrics.statements = currentMetrics.lines; // Approximate

                // Accumulate totals
                totalLines.covered += currentMetrics.lines.covered;
                totalLines.total += currentMetrics.lines.total;
                totalFunctions.covered += currentMetrics.functions.covered;
                totalFunctions.total += currentMetrics.functions.total;
                totalBranches.covered += currentMetrics.branches.covered;
                totalBranches.total += currentMetrics.branches.total;

                // Add low coverage files to uncovered code
                if (currentMetrics.lines.pct < 50 && currentUncoveredLines.length > 0) {
                    uncoveredCode.push({
                        filePath: currentFile,
                        type: 'line',
                        lineRange: {
                            start: Math.min(...currentUncoveredLines),
                            end: Math.max(...currentUncoveredLines)
                        },
                        suggestion: `${currentUncoveredLines.length} lines without test coverage`,
                    });
                }

                for (const funcName of currentUncoveredFunctions) {
                    uncoveredCode.push({
                        filePath: currentFile,
                        functionName: funcName,
                        type: 'function',
                        lineRange: { start: 1, end: 1 },
                        suggestion: `Function '${funcName}' has no test coverage`,
                    });
                }

                files.push({
                    path: currentFile,
                    metrics: { ...currentMetrics },
                    uncoveredLines: [...currentUncoveredLines],
                    uncoveredBranches: [],
                    uncoveredFunctions: [...currentUncoveredFunctions],
                });

                currentFile = null;
            }
        }

        // Calculate overall metrics
        const overall: CoverageMetrics = {
            statements: {
                covered: totalLines.covered,
                total: totalLines.total,
                pct: totalLines.total > 0 ? (totalLines.covered / totalLines.total) * 100 : 100,
            },
            branches: {
                covered: totalBranches.covered,
                total: totalBranches.total,
                pct: totalBranches.total > 0 ? (totalBranches.covered / totalBranches.total) * 100 : 100,
            },
            functions: {
                covered: totalFunctions.covered,
                total: totalFunctions.total,
                pct: totalFunctions.total > 0 ? (totalFunctions.covered / totalFunctions.total) * 100 : 100,
            },
            lines: {
                covered: totalLines.covered,
                total: totalLines.total,
                pct: totalLines.total > 0 ? (totalLines.covered / totalLines.total) * 100 : 100,
            },
        };

        return {
            overall,
            files,
            uncoveredCode,
            timestamp: new Date().toISOString(),
            hasReport: true,
        };
    } catch (error) {
        console.error('Error parsing LCOV report:', error);
        return createEmptyAnalysis();
    }
}

// ========== ESLint Static Analysis ==========

/**
 * Run ESLint on specified files or directory
 */
export async function runEslintAnalysis(
    targetPath: string,
    options: { fix?: boolean; format?: 'json' | 'stylish' } = {}
): Promise<StaticAnalysis> {
    try {
        const eslintPath = path.join(targetPath, 'node_modules', '.bin', 'eslint');
        const hasEslint = fs.existsSync(eslintPath);

        if (!hasEslint) {
            console.log('ESLint not found in project, skipping static analysis');
            return createEmptyStaticAnalysis();
        }

        const cmd = `${eslintPath} . --format json --ext .js,.jsx,.ts,.tsx 2>/dev/null || true`;

        const { stdout } = await execAsync(cmd, {
            cwd: targetPath,
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });

        if (!stdout.trim()) {
            return createEmptyStaticAnalysis();
        }

        const results = JSON.parse(stdout) as Array<{
            filePath: string;
            messages: Array<{
                line: number;
                column: number;
                severity: 1 | 2;
                ruleId: string;
                message: string;
                fix?: { range: [number, number]; text: string };
            }>;
            errorCount: number;
            warningCount: number;
            fixableErrorCount: number;
            fixableWarningCount: number;
        }>;

        const issues: StaticAnalysisIssue[] = [];
        let errors = 0;
        let warnings = 0;
        let info = 0;
        let fixable = 0;

        for (const file of results) {
            for (const msg of file.messages) {
                const severity = msg.severity === 2 ? 'error' : 'warning';
                issues.push({
                    filePath: file.filePath,
                    line: msg.line,
                    column: msg.column,
                    severity,
                    ruleId: msg.ruleId || 'unknown',
                    message: msg.message,
                    suggestion: msg.fix ? 'Auto-fixable' : undefined,
                });

                if (severity === 'error') errors++;
                else warnings++;
                if (msg.fix) fixable++;
            }
        }

        return {
            issues,
            summary: { errors, warnings, info, fixable },
            hasResults: issues.length > 0,
        };
    } catch (error) {
        console.error('Error running ESLint:', error);
        return createEmptyStaticAnalysis();
    }
}

// ========== Combined Analysis ==========

/**
 * Get full coverage analysis from existing reports
 */
export function getCoverageAnalysis(repoPath: string = '.'): CoverageAnalysis {
    const report = detectCoverageReport(repoPath);

    if (!report.found || !report.path) {
        return createEmptyAnalysis();
    }

    switch (report.format) {
        case 'json':
            return parseCoverageJson(report.path);
        case 'lcov':
            return parseLcovReport(report.path);
        default:
            return createEmptyAnalysis();
    }
}

/**
 * Run coverage analysis using nyc (generates report if needed)
 */
export async function runCoverageAnalysis(
    repoPath: string = '.',
    options: { regenerate?: boolean } = {}
): Promise<CoverageAnalysis> {
    // Check for existing report first
    if (!options.regenerate) {
        const existing = getCoverageAnalysis(repoPath);
        if (existing.hasReport) {
            return existing;
        }
    }

    // Try to run coverage
    try {
        console.log('📊 Running coverage analysis...');

        // Check if nyc or jest --coverage is available
        const packageJsonPath = path.join(repoPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            return createEmptyAnalysis();
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const scripts = packageJson.scripts || {};

        let cmd: string | null = null;

        if (scripts['test:coverage']) {
            cmd = 'npm run test:coverage';
        } else if (scripts['coverage']) {
            cmd = 'npm run coverage';
        } else if (scripts['test'] && packageJson.devDependencies?.jest) {
            cmd = 'npm test -- --coverage --coverageReporters=json-summary';
        } else if (packageJson.devDependencies?.nyc) {
            cmd = 'npx nyc --reporter=json-summary npm test';
        }

        if (cmd) {
            console.log(`   Running: ${cmd}`);
            await execAsync(cmd, { cwd: repoPath, timeout: 300000 }); // 5 min timeout
            return getCoverageAnalysis(repoPath);
        }

        return createEmptyAnalysis();
    } catch (error) {
        console.error('Coverage analysis failed:', error);
        return createEmptyAnalysis();
    }
}

/**
 * Get files with low coverage that need test suggestions
 */
export function getLowCoverageFiles(
    analysis: CoverageAnalysis,
    threshold: number = 50
): FileCoverage[] {
    return analysis.files.filter(f => f.metrics.lines.pct < threshold);
}

/**
 * Format coverage analysis for CLI output
 */
export function formatCoverageReport(analysis: CoverageAnalysis): string {
    if (!analysis.hasReport) {
        return '📊 No coverage report found. Run tests with coverage to generate one.';
    }

    const lines: string[] = [];

    lines.push('📊 Coverage Summary');
    lines.push('═'.repeat(50));
    lines.push(`  Statements: ${analysis.overall.statements.pct.toFixed(1)}% (${analysis.overall.statements.covered}/${analysis.overall.statements.total})`);
    lines.push(`  Branches:   ${analysis.overall.branches.pct.toFixed(1)}% (${analysis.overall.branches.covered}/${analysis.overall.branches.total})`);
    lines.push(`  Functions:  ${analysis.overall.functions.pct.toFixed(1)}% (${analysis.overall.functions.covered}/${analysis.overall.functions.total})`);
    lines.push(`  Lines:      ${analysis.overall.lines.pct.toFixed(1)}% (${analysis.overall.lines.covered}/${analysis.overall.lines.total})`);

    const lowCoverage = getLowCoverageFiles(analysis, 50);
    if (lowCoverage.length > 0) {
        lines.push('');
        lines.push('⚠️  Files with low coverage (<50%):');
        for (const file of lowCoverage.slice(0, 10)) {
            const shortPath = file.path.split('/').slice(-2).join('/');
            lines.push(`    ${shortPath}: ${file.metrics.lines.pct.toFixed(1)}%`);
        }
        if (lowCoverage.length > 10) {
            lines.push(`    ... and ${lowCoverage.length - 10} more files`);
        }
    }

    if (analysis.uncoveredCode.length > 0) {
        lines.push('');
        lines.push('🔍 Uncovered code suggestions:');
        for (const item of analysis.uncoveredCode.slice(0, 5)) {
            lines.push(`    ${item.suggestion || 'Needs test coverage'}`);
        }
    }

    return lines.join('\n');
}

/**
 * Format static analysis for CLI output
 */
export function formatStaticAnalysis(analysis: StaticAnalysis): string {
    if (!analysis.hasResults) {
        return '✅ No static analysis issues found.';
    }

    const lines: string[] = [];

    lines.push('🔬 Static Analysis Summary');
    lines.push('═'.repeat(50));
    lines.push(`  Errors:   ${analysis.summary.errors}`);
    lines.push(`  Warnings: ${analysis.summary.warnings}`);
    lines.push(`  Fixable:  ${analysis.summary.fixable}`);

    if (analysis.issues.length > 0) {
        lines.push('');
        lines.push('Top issues:');
        for (const issue of analysis.issues.slice(0, 5)) {
            const shortPath = issue.filePath.split('/').slice(-2).join('/');
            const icon = issue.severity === 'error' ? '❌' : '⚠️';
            lines.push(`  ${icon} ${shortPath}:${issue.line} - ${issue.message}`);
        }
    }

    return lines.join('\n');
}

// ========== Helper Functions ==========

function createEmptyMetrics(): CoverageMetrics {
    return {
        statements: { covered: 0, total: 0, pct: 0 },
        branches: { covered: 0, total: 0, pct: 0 },
        functions: { covered: 0, total: 0, pct: 0 },
        lines: { covered: 0, total: 0, pct: 0 },
    };
}

function createEmptyAnalysis(): CoverageAnalysis {
    return {
        overall: createEmptyMetrics(),
        files: [],
        uncoveredCode: [],
        timestamp: new Date().toISOString(),
        hasReport: false,
    };
}

function createEmptyStaticAnalysis(): StaticAnalysis {
    return {
        issues: [],
        summary: { errors: 0, warnings: 0, info: 0, fixable: 0 },
        hasResults: false,
    };
}
