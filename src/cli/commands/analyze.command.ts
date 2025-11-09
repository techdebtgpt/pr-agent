import * as fs from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { PRAnalyzerAgent } from '../../agents/pr-analyzer-agent.js';
import { loadUserConfig, getApiKey } from '../utils/config-loader.js';

interface AnalyzeOptions {
  diff?: string;
  file?: string;
  staged?: boolean;
  branch?: string;
  title?: string;
  provider?: string;
  model?: string;
  agent?: boolean;
  summary?: boolean;
  risks?: boolean;
  complexity?: boolean;
  full?: boolean;
  verbose?: boolean;
  maxCost?: number;
}

interface AnalysisMode {
  summary: boolean;
  risks: boolean;
  complexity: boolean;
}

/**
 * Determine which files should be skipped during analysis
 */
function shouldSkipFile(filePath: string): boolean {
  // Skip dist files and other build artifacts
  if (filePath.startsWith('dist/') || filePath.includes('/dist/')) {
    return true;
  }
  if (filePath.startsWith('node_modules/') || filePath.includes('/node_modules/')) {
    return true;
  }
  // Skip .map files in dist
  if (filePath.endsWith('.map') && filePath.includes('dist/')) {
    return true;
  }
  // Skip .d.ts files in dist
  if (filePath.includes('.d.ts') && filePath.includes('dist/')) {
    return true;
  }
  return false;
}

/**
 * Get untracked files from git
 */
async function getUntrackedFiles(): Promise<string[]> {
  try {
    const output = execSync('git ls-files --others --exclude-standard', {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return output
      .trim()
      .split('\n')
      .filter((f) => f.length > 0 && !shouldSkipFile(f));
  } catch (error) {
    return [];
  }
}

/**
 * Get git diff with optional command
 */
async function getGitDiff(command?: string): Promise<string> {
  try {
    let diff: string = '';
    const maxBuffer = 200 * 1024 * 1024; // 200MB

    if (!command || command === 'origin/main') {
      try {
        diff = execSync('git diff origin/main', {
          encoding: 'utf-8',
          maxBuffer,
        });
      } catch {
        // Fallback to main branch
        console.log(chalk.yellow('⚠️  origin/main not found, trying main branch...'));
        diff = execSync('git diff main', {
          encoding: 'utf-8',
          maxBuffer,
        });
      }
    } else if (command === 'staged') {
      diff = execSync('git diff --staged', {
        encoding: 'utf-8',
        maxBuffer,
      });
    } else {
      // Custom branch or reference
      diff = execSync(`git diff ${command}`, {
        encoding: 'utf-8',
        maxBuffer,
      });
    }

    // Normalize diff (remove trailing whitespace but preserve structure)
    diff = diff.trim();

    // Filter out dist files from the diff itself
    const lines = diff.split('\n');
    const filteredLines: string[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith('diff --git')) {
        const match = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
        if (match) {
          const filePath = match[2] !== '/dev/null' ? match[2] : match[1];
          if (shouldSkipFile(filePath)) {
            // Skip this entire file block - jump to next diff --git line
            i++;
            while (i < lines.length && !lines[i].startsWith('diff --git')) {
              i++;
            }
            continue; // Skip adding this block
          }
        }
      }
      filteredLines.push(line);
      i++;
    }
    diff = filteredLines.join('\n').trim();

    // Also get untracked files and add them as new files in the diff format
    const untrackedFiles = await getUntrackedFiles();
    if (untrackedFiles.length > 0) {
      for (const filePath of untrackedFiles) {
        if (shouldSkipFile(filePath)) continue;
        try {
          // Skip binary files and very large files (>5MB)
          if (!fs.existsSync(filePath)) continue;
          const stats = fs.statSync(filePath);
          if (stats.size > 5 * 1024 * 1024) continue;

          // Try to read as text (will throw for binary files)
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');

          // Format as git diff for new file (proper git diff format)
          const diffHeader = `diff --git a/dev/null b/${filePath}\nnew file mode 100644\nindex 0000000..1111111\n--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n`;

          // Add content with + prefix (git diff format)
          let fileDiff = diffHeader;
          for (const line of lines) {
            fileDiff += `+${line}\n`;
          }

          diff += (diff ? '\n' : '') + fileDiff;
        } catch (err) {
          // Skip files that can't be read as text (binary, permissions, etc.)
          try {
            if (fs.existsSync(filePath)) {
              const stats = fs.statSync(filePath);
              // Add binary file indicator
              diff += (diff ? '\n' : '') + `diff --git a/dev/null b/${filePath}\nnew file mode 100644\nBinary file (${(stats.size / 1024).toFixed(0)}KB)\n`;
            }
          } catch (statErr) {
            // Skip this file
            continue;
          }
        }
      }
    }

    // If diff is empty, check if we have untracked files
    if (!diff.trim() && untrackedFiles.length === 0) {
      throw new Error('No changes detected');
    }

    return diff || '';
  } catch (error) {
    console.error(chalk.red.bold('❌  Error getting git diff:'), error);
    console.error(chalk.yellow('💡  Make sure you have a git repository with changes to analyze.'));
    process.exit(1);
  }
}

/**
 * Get PR title from git
 */
async function getPRTitle(): Promise<string | undefined> {
  try {
    const title = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
    return title;
  } catch (error) {
    return undefined;
  }
}

/**
 * Estimate diff size in tokens
 */
function estimateDiffSize(diff: string): number {
  // Rough estimate: 1 character ≈ 0.25 tokens
  return Math.ceil(diff.length / 4);
}

/**
 * Analyze command - analyze PR diffs with AI
 *
 * This is the primary command for analyzing pull requests. It:
 * 1. Auto-detects git diff (defaults to origin/main)
 * 2. Supports custom diff sources (file, staged, branch)
 * 3. Uses intelligent agent for large diffs
 * 4. Provides risk, complexity, and summary analysis
 *
 * @example
 * // Analyze current branch against origin/main
 * pr-agent analyze
 *
 * // Analyze staged changes
 * pr-agent analyze --staged
 *
 * // Analyze against specific branch
 * pr-agent analyze --branch develop
 *
 * // Full analysis with all modes
 * pr-agent analyze --full
 *
 * // Use intelligent agent
 * pr-agent analyze --agent
 */
export async function analyzePR(options: AnalyzeOptions = {}): Promise<void> {
  const spinner = ora('Initializing PR analysis...').start();

  try {
    // Load configuration
    const config = await loadUserConfig(false);
    
    // Get API key from config or environment
    const provider = options.provider || config.ai?.provider || 'anthropic';
    const apiKey = getApiKey(provider, config);
    
    if (!apiKey) {
      spinner.fail('No API key found');
      console.error(chalk.yellow('💡  Please set it in one of these ways:'));
      console.error(chalk.gray('   1. Run: pr-agent config --init'));
      console.error(chalk.gray('   2. Set environment variable: export ANTHROPIC_API_KEY="your-api-key"'));
      process.exit(1);
    }

    // Determine analysis mode
    const mode: AnalysisMode = {
      summary: options.summary || options.full || false,
      risks: options.risks || options.full || false,
      complexity: options.complexity || options.full || false,
    };

    // Default to full if no mode specified
    if (!mode.summary && !mode.risks && !mode.complexity) {
      mode.summary = true;
      mode.risks = true;
      mode.complexity = true;
    }

    spinner.text = 'Fetching diff...';

    // Get the diff
    let diff: string;
    if (options.diff) {
      diff = options.diff;
    } else if (options.file) {
      diff = fs.readFileSync(options.file, 'utf-8');
    } else if (options.staged) {
      diff = await getGitDiff('staged');
    } else if (options.branch) {
      diff = await getGitDiff(options.branch);
    } else {
      diff = await getGitDiff();
    }

    if (!diff) {
      spinner.fail('No diff found');
      process.exit(1);
    }

    const title = options.title || (await getPRTitle());

    // Estimate token count
    const estimatedTokens = estimateDiffSize(diff);
    spinner.succeed(
      `Diff ready: ~${estimatedTokens.toLocaleString()} tokens (${(diff.length / 1024).toFixed(0)}KB)`,
    );

    // Determine whether to use agent
    const useAgent = options.agent || diff.length > 50000;

    if (useAgent) {
      // Use intelligent agent for large diffs or if explicitly requested
      console.log(
        chalk.magenta.bold(
          '\n🤖  Using Intelligent Agent Analysis (handling large diffs without chunking)...\n',
        ),
      );
      console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

      const model = options.model || config.ai?.model || 'claude-sonnet-4-5-20250929';
      const agent = new PRAnalyzerAgent(apiKey, model);
      const result = await agent.analyze(diff, title, mode);

      // Display results
      displayAgentResults(result, mode, options.verbose || false);
    }
  } catch (error: any) {
    spinner.fail('Analysis failed');
    if (error.message && error.message.includes('rate-limits')) {
      console.error(chalk.red.bold('\n❌  Rate limit error: Your diff is too large for the API.'));
      console.error(
        chalk.yellow('\n💡  Try using --agent flag for intelligent analysis of large diffs'),
      );
    } else {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
    }
    process.exit(1);
  }
}

/**
 * Display agent analysis results
 */
function displayAgentResults(result: any, mode: AnalysisMode, verbose: boolean): void {
  console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green.bold('\n✨  Agent Analysis Complete!\n'));

  // Clean summary - remove markdown headers and duplicates
  let cleanSummary = result.summary;
  cleanSummary = cleanSummary.replace(/^#+\s*PR Analysis:?\s*/im, '');
  cleanSummary = cleanSummary.replace(/^##\s*Summary\s*/im, '');
  cleanSummary = cleanSummary.trim();

  if (mode.summary) {
    console.log(chalk.cyan.bold('📋 Overall Summary\n'));
    console.log(chalk.white(cleanSummary));
    console.log('\n');
  }

  // Group risks by file for better organization
  if (mode.risks && result.fileAnalyses.size > 0) {
    const fileEntries = Array.from(result.fileAnalyses.entries()) as Array<[string, any]>;
    const filesWithRisks = fileEntries.filter(([_, analysis]) => analysis.risks.length > 0);

    if (filesWithRisks.length > 0) {
      console.log(chalk.yellow.bold(`⚠️  Risks by File (${filesWithRisks.length} files with risks)\n`));

      filesWithRisks.forEach(([path, analysis]) => {
        console.log(chalk.cyan(`  ${path}`));
        analysis.risks.forEach((risk: string, i: number) => {
          const cleanRisk = risk.replace(/^\[File: [^\]]+\]\s*/, '');
          console.log(chalk.white(`    ${i + 1}. ${cleanRisk}`));
        });
        console.log('');
      });
    } else if (result.overallRisks.length > 0) {
      console.log(chalk.yellow.bold('⚠️  Overall Risks\n'));
      result.overallRisks.forEach((risk: string, i: number) => {
        console.log(chalk.white(`  ${i + 1}. ${risk}`));
      });
      console.log('\n');
    } else {
      console.log(chalk.yellow.bold('⚠️  Risks\n'));
      console.log(chalk.white('  None identified\n\n'));
    }
  }

  if (mode.complexity) {
    console.log(chalk.magenta.bold(`📊 Overall Complexity: ${result.overallComplexity}/5\n`));
  }

  // Show file-level complexity summary if requested
  if ((mode.summary || mode.complexity) && result.fileAnalyses.size > 0) {
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.cyan.bold(`\n📁 File Analysis (${result.fileAnalyses.size} files)\n`));

    const fileEntries = Array.from(result.fileAnalyses.entries()) as Array<[string, any]>;
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

  // Show recommendations if available
  if (result.recommendations.length > 0) {
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.cyan.bold('\n💡 Recommendations\n'));
    result.recommendations.forEach((rec: string, i: number) => {
      console.log(chalk.white(`  ${i + 1}. ${rec}`));
    });
    console.log('\n');
  }

  // Show agent reasoning if available (minimal)
  if (verbose && result.reasoning.length > 0 && result.reasoning.length <= 5) {
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.cyan.bold('\n🤔 Analysis Strategy\n'));
    result.reasoning.forEach((reason: string, i: number) => {
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


