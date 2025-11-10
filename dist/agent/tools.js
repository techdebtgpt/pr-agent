"use strict";
/**
 * LangChain Tools for PR Analysis Agent
 * These tools allow the agent to perform specific analysis tasks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.prAnalysisTools = exports.generateRecommendationsTool = exports.assessRisksTool = exports.detectPatternsTool = exports.analyzeFileTool = exports.parseDiffTool = void 0;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
/**
 * Parse git diff into structured file changes
 */
exports.parseDiffTool = new tools_1.DynamicStructuredTool({
    name: 'parse_diff',
    description: `Parse a git diff string into structured file changes. 
  Returns list of files with their paths, change types, additions, deletions, and diff content.
  Use this first to understand what files were changed.`,
    schema: zod_1.z.object({
        diff: zod_1.z.string().describe('The git diff string to parse'),
    }),
    func: async ({ diff }) => {
        const files = [];
        const diffBlocks = diff.split(/^diff --git /m).filter(Boolean);
        for (const block of diffBlocks) {
            const lines = block.split('\n');
            const firstLine = lines[0];
            // Extract file paths
            const match = firstLine.match(/a\/(.+?) b\/(.+?)$/);
            if (!match)
                continue;
            const oldPath = match[1];
            const newPath = match[2];
            const path = newPath !== '/dev/null' ? newPath : oldPath;
            // Determine status
            let status = 'M'; // Modified
            if (oldPath === '/dev/null')
                status = 'A'; // Added
            if (newPath === '/dev/null')
                status = 'D'; // Deleted
            // Count additions and deletions
            let additions = 0;
            let deletions = 0;
            for (const line of lines) {
                if (line.startsWith('+') && !line.startsWith('+++'))
                    additions++;
                if (line.startsWith('-') && !line.startsWith('---'))
                    deletions++;
            }
            // Detect language from file extension
            const language = detectLanguage(path);
            files.push({
                path,
                status,
                additions,
                deletions,
                diff: block,
                language,
            });
        }
        return JSON.stringify({
            totalFiles: files.length,
            files: files.map((f) => ({
                path: f.path,
                status: f.status,
                additions: f.additions,
                deletions: f.deletions,
                language: f.language,
            })),
            summary: `Found ${files.length} changed files: ${files.filter((f) => f.status === 'A').length} added, ${files.filter((f) => f.status === 'M').length} modified, ${files.filter((f) => f.status === 'D').length} deleted`,
        });
    },
});
/**
 * Analyze a specific file for complexity and patterns
 */
exports.analyzeFileTool = new tools_1.DynamicStructuredTool({
    name: 'analyze_file',
    description: `Analyze a specific file's changes for complexity, patterns, and potential issues.
  Use this to deep-dive into specific files that seem important or risky.`,
    schema: zod_1.z.object({
        filePath: zod_1.z.string().describe('Path of the file to analyze'),
        diff: zod_1.z.string().describe('The diff content for this file'),
        context: zod_1.z.string().optional().describe('Additional context about this file'),
    }),
    func: async ({ filePath, diff, context }) => {
        const lines = diff.split('\n');
        const addedLines = lines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
        const deletedLines = lines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;
        const totalChanges = addedLines + deletedLines;
        // Calculate complexity score (1-5)
        let complexity = 1;
        if (totalChanges > 200)
            complexity = 5;
        else if (totalChanges > 100)
            complexity = 4;
        else if (totalChanges > 50)
            complexity = 3;
        else if (totalChanges > 20)
            complexity = 2;
        // Detect patterns and potential issues
        const patterns = [];
        const risks = [];
        // Pattern detection
        if (diff.includes('class ') || diff.includes('interface '))
            patterns.push('OOP structures');
        if (diff.includes('async ') || diff.includes('await '))
            patterns.push('Async operations');
        if (diff.includes('import ') || diff.includes('require('))
            patterns.push('Dependencies');
        if (diff.includes('export '))
            patterns.push('Exported functionality');
        if (diff.includes('TODO') || diff.includes('FIXME'))
            patterns.push('TODO/FIXME comments');
        // Risk detection
        if (diff.includes('eval(') || diff.includes('dangerouslySetInnerHTML')) {
            risks.push('Potential security vulnerability: unsafe code execution');
        }
        if (diff.includes('password') || diff.includes('secret') || diff.includes('api_key')) {
            risks.push('Potential sensitive data exposure');
        }
        if (diff.includes('DELETE FROM') || diff.includes('DROP TABLE')) {
            risks.push('Database destructive operations');
        }
        if (totalChanges > 150) {
            risks.push('Large change - may need careful review');
        }
        if (diff.includes('// @ts-ignore') || diff.includes('// eslint-disable')) {
            risks.push('Linting/type checking disabled');
        }
        return JSON.stringify({
            file: filePath,
            complexity,
            changes: {
                additions: addedLines,
                deletions: deletedLines,
                total: totalChanges,
            },
            patterns,
            risks,
            language: detectLanguage(filePath),
        });
    },
});
/**
 * Detect design patterns and architectural decisions
 */
exports.detectPatternsTool = new tools_1.DynamicStructuredTool({
    name: 'detect_patterns',
    description: `Detect design patterns, architectural decisions, and code structures across all changes.
  Use this to understand the broader impact and design approach of the PR.`,
    schema: zod_1.z.object({
        diff: zod_1.z.string().describe('The complete diff to analyze'),
        fileList: zod_1.z.array(zod_1.z.string()).describe('List of changed file paths'),
    }),
    func: async ({ diff, fileList }) => {
        const patterns = [];
        const architecturalChanges = [];
        // Detect testing patterns
        const testFiles = fileList.filter((f) => f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__'));
        if (testFiles.length > 0) {
            patterns.push(`Testing: ${testFiles.length} test files modified`);
        }
        // Detect configuration changes
        const configFiles = fileList.filter((f) => f.includes('config') || f.includes('.json') || f.includes('.yml') || f.includes('.yaml'));
        if (configFiles.length > 0) {
            architecturalChanges.push(`Configuration: ${configFiles.length} config files changed`);
        }
        // Detect API changes
        if (diff.includes('app.get(') || diff.includes('app.post(') || diff.includes('@route')) {
            patterns.push('API routes modified');
        }
        // Detect database changes
        if (diff.includes('CREATE TABLE') || diff.includes('ALTER TABLE') || diff.includes('migration')) {
            architecturalChanges.push('Database schema changes');
        }
        // Detect dependency changes
        if (fileList.some((f) => f.includes('package.json') || f.includes('requirements.txt'))) {
            architecturalChanges.push('Dependencies updated');
        }
        // Detect UI changes
        const uiFiles = fileList.filter((f) => f.includes('.tsx') || f.includes('.jsx') || f.includes('.vue') || f.includes('.css'));
        if (uiFiles.length > 0) {
            patterns.push(`UI: ${uiFiles.length} UI files modified`);
        }
        // Detect build/CI changes
        if (fileList.some((f) => f.includes('Dockerfile') || f.includes('.github') || f.includes('ci.'))) {
            architecturalChanges.push('Build/CI configuration changed');
        }
        return JSON.stringify({
            designPatterns: patterns,
            architecturalChanges,
            scope: {
                files: fileList.length,
                testFiles: testFiles.length,
                configFiles: configFiles.length,
                uiFiles: uiFiles.length,
            },
        });
    },
});
/**
 * Assess risks and security concerns
 */
exports.assessRisksTool = new tools_1.DynamicStructuredTool({
    name: 'assess_risks',
    description: `Assess overall risks, security concerns, and breaking changes in the PR.
  Use this to identify critical issues that need attention.`,
    schema: zod_1.z.object({
        diff: zod_1.z.string().describe('The complete diff to analyze'),
        fileAnalyses: zod_1.z.array(zod_1.z.any()).describe('Array of file analysis results'),
    }),
    func: async ({ diff, fileAnalyses }) => {
        const risks = [];
        // Aggregate file-level risks
        for (const analysis of fileAnalyses) {
            if (analysis.risks && analysis.risks.length > 0) {
                for (const risk of analysis.risks) {
                    risks.push({
                        severity: 'medium',
                        category: 'file-level',
                        description: `${analysis.file}: ${risk}`,
                    });
                }
            }
        }
        // Check for high-impact changes
        const criticalPatterns = [
            { pattern: /process\.env\[['"].*SECRET/g, severity: 'high', desc: 'Environment variable secret handling' },
            { pattern: /eval\(/g, severity: 'critical', desc: 'Code evaluation (eval) detected' },
            { pattern: /dangerouslySetInnerHTML/g, severity: 'high', desc: 'XSS risk: dangerouslySetInnerHTML' },
            { pattern: /exec\(|system\(/g, severity: 'critical', desc: 'Command execution detected' },
            { pattern: /SELECT \* FROM/gi, severity: 'medium', desc: 'SELECT * query (performance concern)' },
            { pattern: /cors.*origin.*\*/g, severity: 'high', desc: 'CORS wildcard origin' },
        ];
        for (const { pattern, severity, desc } of criticalPatterns) {
            if (pattern.test(diff)) {
                risks.push({
                    severity,
                    category: 'security',
                    description: desc,
                });
            }
        }
        // Check for breaking changes
        if (diff.includes('BREAKING CHANGE') || diff.includes('breaking:')) {
            risks.push({
                severity: 'high',
                category: 'breaking-change',
                description: 'Breaking change mentioned in commit message',
            });
        }
        // Sort by severity
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        risks.sort((a, b) => severityOrder[a.severity] -
            severityOrder[b.severity]);
        return JSON.stringify({
            totalRisks: risks.length,
            critical: risks.filter((r) => r.severity === 'critical').length,
            high: risks.filter((r) => r.severity === 'high').length,
            medium: risks.filter((r) => r.severity === 'medium').length,
            risks: risks.slice(0, 10), // Top 10 risks
            recommendation: risks.length === 0
                ? 'No significant risks detected'
                : risks.length > 5
                    ? 'Careful review recommended - multiple risks detected'
                    : 'Review recommended for identified risks',
        });
    },
});
/**
 * Generate recommendations based on analysis
 */
exports.generateRecommendationsTool = new tools_1.DynamicStructuredTool({
    name: 'generate_recommendations',
    description: `Generate actionable recommendations based on the analysis results.
  Use this at the end to provide constructive feedback.`,
    schema: zod_1.z.object({
        analysisResults: zod_1.z.string().describe('JSON string of all analysis results'),
        overallComplexity: zod_1.z.number().describe('Overall complexity score (1-5)'),
    }),
    func: async ({ analysisResults, overallComplexity }) => {
        const recommendations = [];
        const results = JSON.parse(analysisResults);
        // Recommendations based on complexity
        if (overallComplexity >= 4) {
            recommendations.push('Consider breaking this PR into smaller, focused changes');
            recommendations.push('Add comprehensive tests for high-complexity areas');
        }
        // Recommendations based on risks
        if (results.risks && results.risks.length > 0) {
            recommendations.push('Address identified security concerns before merging');
            if (results.risks.some((r) => r.severity === 'critical')) {
                recommendations.push('CRITICAL: Review and fix critical security issues immediately');
            }
        }
        // Recommendations based on patterns
        if (results.patterns) {
            if (results.patterns.includes('Database schema changes')) {
                recommendations.push('Ensure database migrations are reversible');
                recommendations.push('Test migration on staging environment');
            }
            if (results.patterns.includes('API routes modified')) {
                recommendations.push('Update API documentation');
                recommendations.push('Verify backward compatibility');
            }
        }
        // General recommendations
        if (results.testFiles === 0) {
            recommendations.push('Consider adding tests for the changes');
        }
        if (recommendations.length === 0) {
            recommendations.push('Changes look good - ready for review');
            recommendations.push('Consider adding descriptive comments for complex logic');
        }
        return JSON.stringify({
            recommendations,
            priority: overallComplexity >= 4 || (results.risks && results.risks.length > 5)
                ? 'high'
                : 'normal',
        });
    },
});
/**
 * Helper function to detect programming language from file path
 */
function detectLanguage(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap = {
        ts: 'TypeScript',
        tsx: 'TypeScript React',
        js: 'JavaScript',
        jsx: 'JavaScript React',
        py: 'Python',
        java: 'Java',
        go: 'Go',
        rs: 'Rust',
        cpp: 'C++',
        c: 'C',
        cs: 'C#',
        rb: 'Ruby',
        php: 'PHP',
        swift: 'Swift',
        kt: 'Kotlin',
        sql: 'SQL',
        yml: 'YAML',
        yaml: 'YAML',
        json: 'JSON',
        md: 'Markdown',
        css: 'CSS',
        scss: 'SCSS',
        html: 'HTML',
    };
    return languageMap[ext || ''] || 'Unknown';
}
/**
 * Export all tools as an array
 */
exports.prAnalysisTools = [
    exports.parseDiffTool,
    exports.analyzeFileTool,
    exports.detectPatternsTool,
    exports.assessRisksTool,
    exports.generateRecommendationsTool,
];
//# sourceMappingURL=tools.js.map