#!/usr/bin/env node
import * as path from 'path';
import * as fs from 'fs';
import { Command } from 'commander';
import { analyzePR } from './commands/analyze.command.js';
import { registerConfigCommand } from './commands/config.command.js';
import { registerHelpCommand } from './commands/help.command.js';
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf-8'));
const program = new Command();
program
    .name('pr-agent')
    .description('AI-powered pull request analyzer and code review assistant')
    .version(packageJson.version);
program
    .command('analyze')
    .description('Analyze pull request changes with AI')
    .option('--diff <text>', 'Provide diff text directly')
    .option('--file <path>', 'Read diff from file')
    .option('--staged', 'Analyze staged changes (git diff --staged)')
    .option('--branch <name>', 'Analyze against specific branch')
    .option('--title <text>', 'PR title (auto-detected from git)')
    .option('--provider <provider>', 'AI provider (claude|openai|google)', 'claude')
    .option('--model <model>', 'Specific model to use')
    .option('--agent', 'Force intelligent agent (recommended for large diffs)')
    .option('--summary', 'Show summary only')
    .option('--risks', 'Show risks only')
    .option('--complexity', 'Show complexity only')
    .option('--full', 'Show all modes (default)', true)
    .option('--max-cost <dollars>', 'Maximum cost in dollars', '5.0')
    .option('--verbose', 'Enable verbose output', false)
    .action(analyzePR);
registerConfigCommand(program);
registerHelpCommand(program);
program.parse();
//# sourceMappingURL=index.js.map