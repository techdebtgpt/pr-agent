#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import { Command } from 'commander';
import { analyzePR } from './commands/analyze.command.js';
import { registerConfigCommand } from './commands/config.command.js';
import { registerHelpCommand } from './commands/help.command.js';
import { registerDashboardCommand } from './commands/dashboard.command.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// __dirname workaround for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJsonPath = path.resolve(__dirname, "../../package.json");
// Read version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(packageJsonPath, 'utf-8'),
);

const program = new Command();

program
  .name('pr-agent')
  .description('AI-powered pull request analyzer and code review assistant')
  .version(packageJson.version);

// Analyze command (primary command for PR analysis)
program
  .command('analyze')
  .description('Analyze pull request changes with AI')
  .option('--diff <text>', 'Provide diff text directly')
  .option('--file <path>', 'Read diff from file')
  .option('--staged', 'Analyze staged changes (git diff --staged)')
  .option('--branch <name>', 'Analyze against specific branch')
  .option('--title <text>', 'PR title (auto-detected from git)')
  .option('--provider <provider>', 'AI provider (anthropic|openai|google|zhipu)')
  .option('--model <model>', 'Specific model to use')
  .option('--agent', 'Force intelligent agent (recommended for large diffs)')
  .option('--summary', 'Show summary only')
  .option('--risks', 'Show risks only')
  .option('--complexity', 'Show complexity only')
  .option('--full', 'Show all modes (default)', true)
  .option('--arch-docs', 'Use architecture documentation from .arch-docs folder (auto-detected by default)')
  .option('--max-cost <dollars>', 'Maximum cost in dollars', '5.0')
  .option('--show-classification', 'Show project type classification (business logic vs QA)', false)
  .option('--scan-coverage', 'Run test coverage analysis using nyc/istanbul', false)
  .option('--show-coverage', 'Display coverage metrics if available', false)
  .option('--show-static-analysis', 'Run and display ESLint static analysis results', false)
  .option('--peer-review', 'Enable Jira peer review integration', false)
  .option('--verbose', 'Enable verbose output', false)
  .action(analyzePR);

// Config command
registerConfigCommand(program);

// Dashboard command
registerDashboardCommand(program);

// Help command
registerHelpCommand(program);

// Parse CLI arguments
program.parse();

