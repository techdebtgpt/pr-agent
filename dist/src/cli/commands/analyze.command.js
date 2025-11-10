import * as fs from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { PRAnalyzerAgent } from '../../agents/pr-analyzer-agent.js';
function shouldSkipFile(filePath) {
    if (filePath.startsWith('dist/') || filePath.includes('/dist/')) {
        return true;
    }
    if (filePath.startsWith('node_modules/') || filePath.includes('/node_modules/')) {
        return true;
    }
    if (filePath.endsWith('.map') && filePath.includes('dist/')) {
        return true;
    }
    if (filePath.includes('.d.ts') && filePath.includes('dist/')) {
        return true;
    }
    return false;
}
async function getUntrackedFiles() {
    try {
        const output = execSync('git ls-files --others --exclude-standard', {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
        });
        return output
            .trim()
            .split('\n')
            .filter((f) => f.length > 0 && !shouldSkipFile(f));
    }
    catch (error) {
        return [];
    }
}
async function getGitDiff(command) {
    try {
        let diff = '';
        const maxBuffer = 200 * 1024 * 1024;
        if (!command || command === 'origin/main') {
            try {
                diff = execSync('git diff origin/main', {
                    encoding: 'utf-8',
                    maxBuffer,
                });
            }
            catch {
                console.log(chalk.yellow('⚠️  origin/main not found, trying main branch...'));
                diff = execSync('git diff main', {
                    encoding: 'utf-8',
                    maxBuffer,
                });
            }
        }
        else if (command === 'staged') {
            diff = execSync('git diff --staged', {
                encoding: 'utf-8',
                maxBuffer,
            });
        }
        else {
            diff = execSync(`git diff ${command}`, {
                encoding: 'utf-8',
                maxBuffer,
            });
        }
        diff = diff.trim();
        const lines = diff.split('\n');
        const filteredLines = [];
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            if (line.startsWith('diff --git')) {
                const match = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
                if (match) {
                    const filePath = match[2] !== '/dev/null' ? match[2] : match[1];
                    if (shouldSkipFile(filePath)) {
                        i++;
                        while (i < lines.length && !lines[i].startsWith('diff --git')) {
                            i++;
                        }
                        continue;
                    }
                }
            }
            filteredLines.push(line);
            i++;
        }
        diff = filteredLines.join('\n').trim();
        const untrackedFiles = await getUntrackedFiles();
        if (untrackedFiles.length > 0) {
            for (const filePath of untrackedFiles) {
                if (shouldSkipFile(filePath))
                    continue;
                try {
                    if (!fs.existsSync(filePath))
                        continue;
                    const stats = fs.statSync(filePath);
                    if (stats.size > 5 * 1024 * 1024)
                        continue;
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const lines = content.split('\n');
                    const diffHeader = `diff --git a/dev/null b/${filePath}\nnew file mode 100644\nindex 0000000..1111111\n--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n`;
                    let fileDiff = diffHeader;
                    for (const line of lines) {
                        fileDiff += `+${line}\n`;
                    }
                    diff += (diff ? '\n' : '') + fileDiff;
                }
                catch (err) {
                    try {
                        if (fs.existsSync(filePath)) {
                            const stats = fs.statSync(filePath);
                            diff += (diff ? '\n' : '') + `diff --git a/dev/null b/${filePath}\nnew file mode 100644\nBinary file (${(stats.size / 1024).toFixed(0)}KB)\n`;
                        }
                    }
                    catch (statErr) {
                        continue;
                    }
                }
            }
        }
        if (!diff.trim() && untrackedFiles.length === 0) {
            throw new Error('No changes detected');
        }
        return diff || '';
    }
    catch (error) {
        console.error(chalk.red.bold('❌  Error getting git diff:'), error);
        console.error(chalk.yellow('💡  Make sure you have a git repository with changes to analyze.'));
        process.exit(1);
    }
}
async function getPRTitle() {
    try {
        const title = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
        return title;
    }
    catch (error) {
        return undefined;
    }
}
function estimateDiffSize(diff) {
    return Math.ceil(diff.length / 4);
}
export async function analyzePR(options = {}) {
    const spinner = ora('Initializing PR analysis...').start();
    try {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            spinner.fail('ANTHROPIC_API_KEY environment variable is not set');
            console.error(chalk.yellow('💡  Please set it with: export ANTHROPIC_API_KEY="your-api-key"'));
            process.exit(1);
        }
        const mode = {
            summary: options.summary || options.full || false,
            risks: options.risks || options.full || false,
            complexity: options.complexity || options.full || false,
        };
        if (!mode.summary && !mode.risks && !mode.complexity) {
            mode.summary = true;
            mode.risks = true;
            mode.complexity = true;
        }
        spinner.text = 'Fetching diff...';
        let diff;
        if (options.diff) {
            diff = options.diff;
        }
        else if (options.file) {
            diff = fs.readFileSync(options.file, 'utf-8');
        }
        else if (options.staged) {
            diff = await getGitDiff('staged');
        }
        else if (options.branch) {
            diff = await getGitDiff(options.branch);
        }
        else {
            diff = await getGitDiff();
        }
        if (!diff) {
            spinner.fail('No diff found');
            process.exit(1);
        }
        const title = options.title || (await getPRTitle());
        const estimatedTokens = estimateDiffSize(diff);
        spinner.succeed(`Diff ready: ~${estimatedTokens.toLocaleString()} tokens (${(diff.length / 1024).toFixed(0)}KB)`);
        const useAgent = options.agent || diff.length > 50000;
        if (useAgent) {
            console.log(chalk.magenta.bold('\n🤖  Using Intelligent Agent Analysis (handling large diffs without chunking)...\n'));
            console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
            const model = options.model || 'claude-sonnet-4-5-20250929';
            const agent = new PRAnalyzerAgent(apiKey, model);
            const result = await agent.analyze(diff, title, mode);
            displayAgentResults(result, mode, options.verbose || false);
        }
    }
    catch (error) {
        spinner.fail('Analysis failed');
        if (error.message && error.message.includes('rate-limits')) {
            console.error(chalk.red.bold('\n❌  Rate limit error: Your diff is too large for the API.'));
            console.error(chalk.yellow('\n💡  Try using --agent flag for intelligent analysis of large diffs'));
        }
        else {
            console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
        }
        process.exit(1);
    }
}
function displayAgentResults(result, mode, verbose) {
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.green.bold('\n✨  Agent Analysis Complete!\n'));
    let cleanSummary = result.summary;
    cleanSummary = cleanSummary.replace(/^#+\s*PR Analysis:?\s*/im, '');
    cleanSummary = cleanSummary.replace(/^##\s*Summary\s*/im, '');
    cleanSummary = cleanSummary.trim();
    if (mode.summary) {
        console.log(chalk.cyan.bold('📋 Overall Summary\n'));
        console.log(chalk.white(cleanSummary));
        console.log('\n');
    }
    if (mode.risks && result.fileAnalyses.size > 0) {
        const fileEntries = Array.from(result.fileAnalyses.entries());
        const filesWithRisks = fileEntries.filter(([_, analysis]) => analysis.risks.length > 0);
        if (filesWithRisks.length > 0) {
            console.log(chalk.yellow.bold(`⚠️  Risks by File (${filesWithRisks.length} files with risks)\n`));
            filesWithRisks.forEach(([path, analysis]) => {
                console.log(chalk.cyan(`  ${path}`));
                analysis.risks.forEach((risk, i) => {
                    const cleanRisk = risk.replace(/^\[File: [^\]]+\]\s*/, '');
                    console.log(chalk.white(`    ${i + 1}. ${cleanRisk}`));
                });
                console.log('');
            });
        }
        else if (result.overallRisks.length > 0) {
            console.log(chalk.yellow.bold('⚠️  Overall Risks\n'));
            result.overallRisks.forEach((risk, i) => {
                console.log(chalk.white(`  ${i + 1}. ${risk}`));
            });
            console.log('\n');
        }
        else {
            console.log(chalk.yellow.bold('⚠️  Risks\n'));
            console.log(chalk.white('  None identified\n\n'));
        }
    }
    if (mode.complexity) {
        console.log(chalk.magenta.bold(`📊 Overall Complexity: ${result.overallComplexity}/5\n`));
    }
    if ((mode.summary || mode.complexity) && result.fileAnalyses.size > 0) {
        console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.cyan.bold(`\n📁 File Analysis (${result.fileAnalyses.size} files)\n`));
        const fileEntries = Array.from(result.fileAnalyses.entries());
        const highComplexity = fileEntries.filter(([_, analysis]) => analysis.complexity >= 4);
        const mediumComplexity = fileEntries.filter(([_, analysis]) => analysis.complexity === 3);
        if (highComplexity.length > 0) {
            console.log(chalk.red.bold('🔴 High Complexity:\n'));
            highComplexity.forEach(([path, analysis]) => {
                console.log(chalk.white(`  • ${path} (${analysis.complexity}/5)`));
                if (mode.risks && analysis.risks.length > 0) {
                    console.log(chalk.gray(`    ${analysis.risks.length} risk${analysis.risks.length > 1 ? 's' : ''} found`));
                }
            });
            console.log('');
        }
        if (mediumComplexity.length > 0 && mediumComplexity.length <= 10) {
            console.log(chalk.yellow.bold('🟡 Medium Complexity:\n'));
            mediumComplexity.slice(0, 5).forEach(([path, analysis]) => {
                console.log(chalk.white(`  • ${path} (${analysis.complexity}/5)`));
            });
            if (mediumComplexity.length > 5) {
                console.log(chalk.gray(`  ... and ${mediumComplexity.length - 5} more`));
            }
            console.log('');
        }
    }
    if (result.recommendations.length > 0) {
        console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.cyan.bold('\n💡 Recommendations\n'));
        result.recommendations.forEach((rec, i) => {
            console.log(chalk.white(`  ${i + 1}. ${rec}`));
        });
        console.log('\n');
    }
    if (verbose && result.reasoning.length > 0 && result.reasoning.length <= 5) {
        console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.cyan.bold('\n🤔 Analysis Strategy\n'));
        result.reasoning.forEach((reason, i) => {
            if (reason.includes('Strategy:') || i === 0) {
                console.log(chalk.gray(`  ${reason.substring(0, 150)}${reason.length > 150 ? '...' : ''}`));
            }
        });
        console.log('\n');
    }
    if (result.totalTokensUsed) {
        console.log(chalk.gray(`\nTotal tokens used: ${result.totalTokensUsed.toLocaleString()}`));
    }
    console.log(chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
}
//# sourceMappingURL=analyze.command.js.map