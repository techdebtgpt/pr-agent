#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const chalk_1 = __importDefault(require("chalk"));
const analyzer_1 = require("./analyzer");
const apiKey = process.env.ANTHROPIC_API_KEY;
async function getPRTitle() {
    try {
        const title = (0, child_process_1.execSync)('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
        return title;
    }
    catch (error) {
        return undefined;
    }
}
function parseArgs() {
    const args = process.argv.slice(2);
    let diff;
    let prTitle;
    let diffCommand;
    const mode = { summary: false, risks: false, complexity: false };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--analyze':
                if (i + 1 < args.length) {
                    const command = args[i + 1];
                    i++; // consume next arg
                    switch (command) {
                        case '--summary':
                            mode.summary = true;
                            break;
                        case '--risks':
                            mode.risks = true;
                            break;
                        case '--complexity':
                            mode.complexity = true;
                            break;
                        case '--full':
                            mode.summary = true;
                            mode.risks = true;
                            mode.complexity = true;
                            break;
                        default:
                            console.error(chalk_1.default.red.bold(`❌  Unknown command: ${command}`));
                            process.exit(1);
                    }
                }
                break;
            case '--diff':
                if (i + 1 < args.length) {
                    diff = args[++i];
                }
                break;
            case '--title':
                if (i + 1 < args.length) {
                    prTitle = args[++i];
                }
                break;
            case '--file':
                if (i + 1 < args.length) {
                    const filePath = args[++i];
                    diff = (0, fs_1.readFileSync)(filePath, 'utf-8');
                }
                break;
            case '--staged':
                diffCommand = 'staged';
                break;
            case '--branch':
                if (i + 1 < args.length) {
                    const branch = args[++i];
                    diffCommand = branch;
                }
                break;
        }
    }
    // If no mode specified, default to full
    if (!mode.summary && !mode.risks && !mode.complexity) {
        mode.summary = true;
        mode.risks = true;
        mode.complexity = true;
    }
    return { diff, mode, prTitle, diffCommand };
}
async function getGitDiffWithCommand(command) {
    try {
        let diff;
        const maxBuffer = 200 * 1024 * 1024; // 200MB
        if (!command || command === 'origin/main') {
            try {
                diff = (0, child_process_1.execSync)('git diff origin/main', {
                    encoding: 'utf-8',
                    maxBuffer
                });
            }
            catch {
                // Fallback to main branch
                console.log(chalk_1.default.yellow('⚠️  origin/main not found, trying main branch...'));
                diff = (0, child_process_1.execSync)('git diff main', {
                    encoding: 'utf-8',
                    maxBuffer
                });
            }
        }
        else if (command === 'staged') {
            diff = (0, child_process_1.execSync)('git diff --staged', {
                encoding: 'utf-8',
                maxBuffer
            });
        }
        else {
            // Custom branch or reference
            diff = (0, child_process_1.execSync)(`git diff ${command}`, {
                encoding: 'utf-8',
                maxBuffer
            });
        }
        if (!diff.trim()) {
            throw new Error('No changes detected');
        }
        return diff;
    }
    catch (error) {
        console.error(chalk_1.default.red.bold('❌  Error getting git diff:'), error);
        console.error(chalk_1.default.yellow('💡  Make sure you have a git repository with changes to analyze.'));
        process.exit(1);
    }
}
function truncateDiff(diff, maxSize = 100000) {
    if (diff.length <= maxSize) {
        return diff;
    }
    console.warn(chalk_1.default.yellow.bold(`⚠️  Diff is very large (${(diff.length / 1024).toFixed(0)}KB). Truncating to ${(maxSize / 1024).toFixed(0)}KB for analysis...`));
    // Try to keep the beginning and end of the diff
    const firstHalf = diff.substring(0, Math.floor(maxSize / 2));
    const lastHalf = diff.substring(diff.length - Math.floor(maxSize / 2));
    return `${firstHalf}

... [diff truncated due to size] ...

${lastHalf}

Note: This analysis is based on a truncated version of your diff due to size limitations. For large changes, consider:
- Breaking the PR into smaller, focused changes
- Analyzing specific files with targeted reviews
- Using the staged option to review changes incrementally`;
}
function estimateDiffSize(diff) {
    // Rough estimate: 1 character ≈ 0.25 tokens
    return Math.ceil(diff.length / 4);
}
async function main() {
    // Show welcome banner
    console.log(chalk_1.default.cyan.bold('\n🤖  PR Agent - AI Code Analyzer\n'));
    if (!apiKey) {
        console.error(chalk_1.default.red.bold('❌  Error: ANTHROPIC_API_KEY environment variable is not set'));
        console.error(chalk_1.default.yellow('💡  Please set it with: export ANTHROPIC_API_KEY="your-api-key"'));
        process.exit(1);
    }
    const { diff, mode, prTitle, diffCommand } = parseArgs();
    // Get the diff
    let finalDiff;
    console.log(chalk_1.default.blue('📥  Fetching diff...'));
    if (diff) {
        finalDiff = diff;
    }
    else if (diffCommand) {
        finalDiff = await getGitDiffWithCommand(diffCommand);
    }
    else {
        finalDiff = await getGitDiffWithCommand();
    }
    const finalTitle = prTitle || await getPRTitle();
    if (!finalDiff) {
        console.error(chalk_1.default.red.bold('❌  Error: No diff found'));
        process.exit(1);
    }
    // Estimate token count
    const estimatedTokens = estimateDiffSize(finalDiff);
    console.log(chalk_1.default.green(`✅  Diff ready: ~${estimatedTokens.toLocaleString()} tokens (${(finalDiff.length / 1024).toFixed(0)}KB)`));
    // Truncate if too large (100k chars ≈ 25k tokens, well within Claude's limit)
    const processedDiff = truncateDiff(finalDiff, 100000);
    if (processedDiff !== finalDiff) {
        const estimatedTokensAfter = estimateDiffSize(processedDiff);
        console.log(chalk_1.default.green(`📊  Truncated to: ~${estimatedTokensAfter.toLocaleString()} tokens`));
    }
    console.log(chalk_1.default.magenta.bold('\n🔍  Analyzing code with Claude AI...\n'));
    console.log(chalk_1.default.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    try {
        const analysis = await (0, analyzer_1.analyzeWithClaude)(processedDiff, finalTitle, apiKey, mode, true);
        console.log(chalk_1.default.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk_1.default.green.bold('\n✨  Analysis Complete!\n'));
        console.log(chalk_1.default.white(analysis));
        console.log(chalk_1.default.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    }
    catch (error) {
        if (error.message && error.message.includes('rate-limits')) {
            console.error(chalk_1.default.red.bold('\n❌  Rate limit error: Your diff is too large for the API.'));
            console.error(chalk_1.default.yellow('\n💡  Solutions:'));
            console.error(chalk_1.default.yellow('  1. Use --staged to analyze only staged changes'));
            console.error(chalk_1.default.yellow('  2. Break your PR into smaller changes'));
            console.error(chalk_1.default.yellow('  3. Analyze specific files using --file option'));
            console.error(chalk_1.default.yellow('  4. Wait a few minutes and try again'));
        }
        else {
            console.error(chalk_1.default.red.bold('\n❌  Error during analysis:'), error);
        }
        process.exit(1);
    }
}
main();
//# sourceMappingURL=cli.js.map