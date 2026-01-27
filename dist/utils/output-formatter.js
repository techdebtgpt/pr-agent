/**
 * Shared output formatting for CLI and MCP server
 * Supports both terminal (chalk colors) and markdown output modes
 */
import chalk from 'chalk';
/**
 * Output formatter that can generate terminal or markdown output
 */
export class OutputFormatter {
    mode;
    verbose;
    constructor(options) {
        this.mode = options.mode;
        this.verbose = options.verbose || false;
    }
    /**
     * Format a section separator line
     */
    separator() {
        if (this.mode === 'markdown') {
            return '\n---\n';
        }
        return chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    /**
     * Format a bold title
     */
    bold(text) {
        if (this.mode === 'markdown') {
            return `**${text}**`;
        }
        return chalk.bold(text);
    }
    /**
     * Format a colored title
     */
    title(text, color = 'cyan') {
        if (this.mode === 'markdown') {
            return `## ${text}`;
        }
        const chalkColor = chalk[color].bold;
        return chalkColor(text);
    }
    /**
     * Format regular text
     */
    text(text) {
        if (this.mode === 'markdown') {
            return text;
        }
        return chalk.white(text);
    }
    /**
     * Format gray/dimmed text
     */
    dim(text) {
        if (this.mode === 'markdown') {
            return text;
        }
        return chalk.gray(text);
    }
    /**
     * Format test suggestions section
     */
    formatTestSuggestions(testSuggestions) {
        if (!testSuggestions || testSuggestions.length === 0) {
            return '';
        }
        const lines = [];
        const newTests = testSuggestions.filter((s) => !s.isEnhancement);
        const enhancements = testSuggestions.filter((s) => s.isEnhancement);
        // New test suggestions
        if (newTests.length > 0) {
            lines.push(this.separator());
            lines.push('');
            if (this.mode === 'markdown') {
                lines.push(`### 🧪 Test Suggestions (${newTests.length})`);
            }
            else {
                lines.push(chalk.yellow.bold(`🧪 Test Suggestions (${newTests.length} files need tests)`));
            }
            lines.push('');
            for (const suggestion of newTests) {
                if (this.mode === 'markdown') {
                    lines.push(`**${suggestion.forFile}**`);
                    lines.push(`- Framework: ${suggestion.testFramework}`);
                    if (suggestion.testFilePath) {
                        lines.push(`- Suggested path: ${suggestion.testFilePath}`);
                    }
                    lines.push('');
                }
                else {
                    lines.push(chalk.cyan(`  📝 ${suggestion.forFile}`));
                    lines.push(chalk.gray(`     Framework: ${suggestion.testFramework}`));
                    if (suggestion.testFilePath) {
                        lines.push(chalk.gray(`     Suggested test file: ${suggestion.testFilePath}`));
                    }
                    lines.push(chalk.white(`     ${suggestion.description}`));
                    lines.push('');
                    // Show test code preview for terminal
                    if (suggestion.testCode) {
                        lines.push(chalk.gray('     ┌─────────────────────────────────────────'));
                        const codeLines = suggestion.testCode.split('\n').slice(0, 10);
                        codeLines.forEach((line) => {
                            lines.push(chalk.gray('     │ ') + chalk.white(line));
                        });
                        if (suggestion.testCode.split('\n').length > 10) {
                            lines.push(chalk.gray('     │ ... (copy full code below)'));
                        }
                        lines.push(chalk.gray('     └─────────────────────────────────────────'));
                        lines.push('');
                    }
                }
            }
        }
        // Test enhancement suggestions
        if (enhancements.length > 0) {
            lines.push(this.separator());
            lines.push('');
            if (this.mode === 'markdown') {
                lines.push(`### 🔬 Test Enhancement Suggestions (${enhancements.length})`);
            }
            else {
                lines.push(chalk.green.bold(`🔬 Test Enhancement Suggestions (${enhancements.length} test files can be improved)`));
            }
            lines.push('');
            for (const suggestion of enhancements) {
                const testFile = suggestion.existingTestFile || suggestion.testFilePath;
                if (this.mode === 'markdown') {
                    lines.push(`**${testFile}**`);
                    lines.push(`- Source: ${suggestion.forFile}`);
                    lines.push(`- ${suggestion.description}`);
                    lines.push('');
                }
                else {
                    lines.push(chalk.cyan(`  📊 ${testFile}`));
                    lines.push(chalk.gray(`     Source: ${suggestion.forFile}`));
                    lines.push(chalk.white(`     ${suggestion.description}`));
                    lines.push('');
                    // Show test code preview for terminal
                    if (suggestion.testCode && suggestion.testCode.trim()) {
                        lines.push(chalk.gray('     ┌─────────────────────────────────────────'));
                        const codeLines = suggestion.testCode.split('\n').slice(0, 15);
                        codeLines.forEach((line) => {
                            lines.push(chalk.gray('     │ ') + chalk.white(line));
                        });
                        if (suggestion.testCode.split('\n').length > 15) {
                            lines.push(chalk.gray('     │ ... (more enhancements available)'));
                        }
                        lines.push(chalk.gray('     └─────────────────────────────────────────'));
                        lines.push('');
                    }
                }
            }
        }
        return lines.join('\n');
    }
    /**
     * Format project classification section
     */
    formatProjectClassification(classification) {
        if (!classification) {
            return '';
        }
        const lines = [];
        lines.push(this.separator());
        if (this.mode === 'markdown') {
            lines.push('');
            lines.push(classification);
        }
        else {
            // Classification already has chalk formatting from the agent
            lines.push(classification);
        }
        return lines.join('\n');
    }
    /**
     * Format coverage report section
     */
    formatCoverageReport(coverageReport) {
        if (!coverageReport || !coverageReport.available) {
            return '';
        }
        const lines = [];
        lines.push(this.separator());
        lines.push('');
        if (this.mode === 'markdown') {
            lines.push('### 📊 Test Coverage Report');
            lines.push('');
            if (coverageReport.overallPercentage !== undefined) {
                const emoji = coverageReport.overallPercentage >= 80 ? '🟢' :
                    coverageReport.overallPercentage >= 60 ? '🟡' : '🔴';
                lines.push(`${emoji} Overall Coverage: **${coverageReport.overallPercentage.toFixed(1)}%**`);
            }
            if (coverageReport.lineCoverage !== undefined) {
                lines.push(`- Lines: ${coverageReport.lineCoverage.toFixed(1)}%`);
            }
            if (coverageReport.branchCoverage !== undefined) {
                lines.push(`- Branches: ${coverageReport.branchCoverage.toFixed(1)}%`);
            }
            if (coverageReport.delta !== undefined) {
                const deltaEmoji = coverageReport.delta >= 0 ? '📈' : '📉';
                lines.push(`${deltaEmoji} Coverage Delta: ${coverageReport.delta >= 0 ? '+' : ''}${coverageReport.delta.toFixed(1)}%`);
            }
        }
        else {
            lines.push(chalk.green.bold('📊 Test Coverage Report'));
            lines.push('');
            if (coverageReport.overallPercentage !== undefined) {
                const emoji = coverageReport.overallPercentage >= 80 ? '🟢' :
                    coverageReport.overallPercentage >= 60 ? '🟡' : '🔴';
                lines.push(chalk.white(`  ${emoji} Overall Coverage: ${coverageReport.overallPercentage.toFixed(1)}%`));
            }
            if (coverageReport.lineCoverage !== undefined) {
                lines.push(chalk.gray(`     Lines: ${coverageReport.lineCoverage.toFixed(1)}%`));
            }
            if (coverageReport.branchCoverage !== undefined) {
                lines.push(chalk.gray(`     Branches: ${coverageReport.branchCoverage.toFixed(1)}%`));
            }
            if (coverageReport.delta !== undefined) {
                const deltaEmoji = coverageReport.delta >= 0 ? '📈' : '📉';
                const deltaColor = coverageReport.delta >= 0 ? chalk.green : chalk.red;
                lines.push(deltaColor(`  ${deltaEmoji} Coverage Delta: ${coverageReport.delta >= 0 ? '+' : ''}${coverageReport.delta.toFixed(1)}%`));
            }
        }
        if (coverageReport.coverageTool) {
            lines.push('');
            lines.push(this.dim(`Tool: ${coverageReport.coverageTool}`));
        }
        lines.push('');
        return lines.join('\n');
    }
    /**
     * Format DevOps cost estimates section
     */
    formatDevOpsCostEstimates(costEstimates) {
        if (!costEstimates || costEstimates.length === 0) {
            return '';
        }
        const lines = [];
        lines.push(this.separator());
        lines.push('');
        if (this.mode === 'markdown') {
            lines.push('## 💰 DevOps Cost Estimates');
            lines.push('');
            const totalCost = costEstimates.reduce((sum, e) => sum + (e.estimatedMonthlyCost || 0), 0);
            lines.push(`**Total Estimated Monthly Cost:** $${totalCost.toFixed(2)}`);
            lines.push('');
            for (const estimate of costEstimates) {
                lines.push(`### ${estimate.resourceType || 'Resource'}`);
                if (estimate.file) {
                    lines.push(`File: \`${estimate.file}\``);
                }
                if (estimate.resourceName) {
                    lines.push(`Name: **${estimate.resourceName}**`);
                }
                if (estimate.estimatedMonthlyCost !== undefined) {
                    lines.push(`Estimated Cost: **$${estimate.estimatedMonthlyCost.toFixed(2)}/month**`);
                }
                if (estimate.notes) {
                    lines.push(`Notes: ${estimate.notes}`);
                }
                lines.push('');
            }
        }
        else {
            lines.push(chalk.yellow.bold('💰 DevOps Cost Estimates'));
            lines.push('');
            const totalCost = costEstimates.reduce((sum, e) => sum + (e.estimatedMonthlyCost || 0), 0);
            lines.push(chalk.white(`  Total Estimated Monthly Cost: $${totalCost.toFixed(2)}`));
            lines.push('');
            for (const estimate of costEstimates) {
                lines.push(chalk.cyan(`  ${estimate.resourceType || 'Resource'}`));
                if (estimate.file) {
                    lines.push(chalk.gray(`     File: ${estimate.file}`));
                }
                if (estimate.resourceName) {
                    lines.push(chalk.white(`     Name: ${estimate.resourceName}`));
                }
                if (estimate.estimatedMonthlyCost !== undefined) {
                    lines.push(chalk.white(`     Estimated Cost: $${estimate.estimatedMonthlyCost.toFixed(2)}/month`));
                }
                if (estimate.notes) {
                    lines.push(chalk.gray(`     Notes: ${estimate.notes}`));
                }
                lines.push('');
            }
        }
        lines.push('');
        return lines.join('\n');
    }
    /**
     * Format static analysis section
     */
    formatStaticAnalysis(staticAnalysis) {
        if (!staticAnalysis) {
            return '';
        }
        const lines = [];
        // Project classification
        if (staticAnalysis.projectClassification) {
            lines.push(this.formatProjectClassification(staticAnalysis.projectClassification));
        }
        // Test suggestions
        if (staticAnalysis.testSuggestions) {
            lines.push(this.formatTestSuggestions(staticAnalysis.testSuggestions));
        }
        // DevOps cost estimates
        if (staticAnalysis.devOpsCostEstimates) {
            lines.push(this.formatDevOpsCostEstimates(staticAnalysis.devOpsCostEstimates));
        }
        // Coverage report
        if (staticAnalysis.coverageReport) {
            lines.push(this.formatCoverageReport(staticAnalysis.coverageReport));
        }
        return lines.join('\n');
    }
}
//# sourceMappingURL=output-formatter.js.map