/**
 * Semgrep runner utility for static analysis
 * Executes Semgrep and processes results
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
const execAsync = promisify(exec);
/**
 * Language to Semgrep rule mapping
 */
const LANGUAGE_RULESETS = {
    typescript: ['p/typescript', 'p/javascript', 'p/react', 'p/security-audit'],
    javascript: ['p/javascript', 'p/react', 'p/security-audit'],
    python: ['p/python', 'p/django', 'p/flask', 'p/security-audit'],
    java: ['p/java', 'p/spring', 'p/security-audit'],
    go: ['p/golang', 'p/security-audit'],
    rust: ['p/rust', 'p/security-audit'],
    csharp: ['p/csharp', 'p/security-audit'],
    ruby: ['p/ruby', 'p/rails', 'p/security-audit'],
    php: ['p/php', 'p/laravel', 'p/security-audit'],
};
/**
 * Check if Semgrep is installed
 */
export async function isSemgrepInstalled() {
    try {
        await execAsync('semgrep --version');
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get Semgrep rulesets based on language and framework
 */
export function getSemgrepRulesets(language, framework) {
    const rulesets = new Set(['auto', 'p/security-audit', 'p/owasp-top-ten']);
    if (language && LANGUAGE_RULESETS[language.toLowerCase()]) {
        LANGUAGE_RULESETS[language.toLowerCase()].forEach(r => rulesets.add(r));
    }
    // Add framework-specific rulesets
    if (framework) {
        const fw = framework.toLowerCase();
        if (fw.includes('react') || fw.includes('next')) {
            rulesets.add('p/react');
        }
        else if (fw.includes('vue')) {
            rulesets.add('p/javascript');
        }
        else if (fw.includes('django')) {
            rulesets.add('p/django');
        }
        else if (fw.includes('flask')) {
            rulesets.add('p/flask');
        }
        else if (fw.includes('express')) {
            rulesets.add('p/javascript');
        }
        else if (fw.includes('spring')) {
            rulesets.add('p/spring');
        }
        else if (fw.includes('rails')) {
            rulesets.add('p/rails');
        }
        else if (fw.includes('laravel')) {
            rulesets.add('p/laravel');
        }
    }
    return Array.from(rulesets);
}
/**
 * Run Semgrep analysis on a directory or specific files
 */
export async function runSemgrepAnalysis(targetPath, config, language, framework) {
    // Check if Semgrep is installed
    const installed = await isSemgrepInstalled();
    if (!installed) {
        console.warn('⚠️  Semgrep is not installed. Skipping static analysis.');
        console.log('   Install Semgrep: https://semgrep.dev/docs/getting-started/');
        return {
            results: [],
            errors: [{
                    level: 'warning',
                    type: 'semgrep_not_installed',
                    message: 'Semgrep is not installed on this system',
                }],
        };
    }
    // Get appropriate rulesets
    const rulesets = config.rulesets || getSemgrepRulesets(language, framework);
    // Build Semgrep command
    const configArgs = rulesets.map(r => `--config ${r}`).join(' ');
    const excludeArgs = config.excludePaths
        ? config.excludePaths.map(p => `--exclude "${p}"`).join(' ')
        : '--exclude "node_modules" --exclude "dist" --exclude "build" --exclude ".git"';
    const timeoutArg = config.timeout ? `--timeout ${config.timeout}` : '--timeout 30';
    const maxFileSizeArg = config.maxFileSize ? `--max-target-bytes ${config.maxFileSize}` : '--max-target-bytes 1000000';
    const command = `semgrep ${configArgs} ${excludeArgs} ${timeoutArg} ${maxFileSizeArg} --json --quiet "${targetPath}"`;
    try {
        console.log('🔍 Running Semgrep static analysis...');
        const { stdout, stderr } = await execAsync(command, {
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });
        if (stderr) {
            console.warn('Semgrep stderr:', stderr);
        }
        const result = JSON.parse(stdout);
        return result;
    }
    catch (error) {
        // Semgrep may exit with non-zero if findings are found
        if (error.stdout) {
            try {
                const result = JSON.parse(error.stdout);
                return result;
            }
            catch {
                // Failed to parse JSON
            }
        }
        console.error('Semgrep execution error:', error.message);
        return {
            results: [],
            errors: [{
                    level: 'error',
                    type: 'execution_error',
                    message: error.message,
                }],
        };
    }
}
/**
 * Summarize Semgrep findings
 */
export function summarizeSemgrepFindings(result) {
    const findings = result.results || [];
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    const categoriesSet = new Set();
    const filesSet = new Set();
    const criticalFindings = [];
    findings.forEach(finding => {
        const severity = finding.extra.severity;
        if (severity === 'ERROR') {
            errorCount++;
            criticalFindings.push(finding);
        }
        else if (severity === 'WARNING') {
            warningCount++;
        }
        else {
            infoCount++;
        }
        // Track categories
        const category = finding.extra.metadata.category || 'unknown';
        categoriesSet.add(category);
        // Track files
        filesSet.add(finding.path);
    });
    return {
        totalFindings: findings.length,
        errorCount,
        warningCount,
        infoCount,
        categoriesAffected: Array.from(categoriesSet),
        criticalFindings: criticalFindings,
        filesWithIssues: Array.from(filesSet),
    };
}
/**
 * Filter Semgrep findings by changed files
 */
export function filterFindingsByChangedFiles(findings, changedFiles) {
    const changedFileSet = new Set(changedFiles.map(f => path.normalize(f)));
    return findings.filter(finding => {
        const normalizedPath = path.normalize(finding.path);
        return changedFileSet.has(normalizedPath) ||
            changedFiles.some(cf => normalizedPath.includes(cf) || cf.includes(normalizedPath));
    });
}
/**
 * Format Semgrep finding for display
 */
export function formatSemgrepFinding(finding) {
    const severity = finding.extra.severity;
    const icon = severity === 'ERROR' ? '❌' : severity === 'WARNING' ? '⚠️' : 'ℹ️';
    return `${icon} [${severity}] ${finding.extra.message}
  File: ${finding.path}:${finding.start.line}
  Rule: ${finding.check_id}
  ${finding.extra.metadata.category ? `Category: ${finding.extra.metadata.category}` : ''}`;
}
//# sourceMappingURL=semgrep-runner.js.map