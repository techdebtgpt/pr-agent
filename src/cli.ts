#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import chalk from 'chalk';
import { analyzeWithClaude } from './analyzer';
import { PRAnalysisAgent } from './pr-agent';
import { AIProviderConfig } from './providers/types';

const apiKey = process.env.ANTHROPIC_API_KEY;

async function getPRTitle(): Promise<string | undefined> {
  try {
    const title = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
    return title;
  } catch (error) {
    return undefined;
  }
}

interface AnalysisMode {
  summary: boolean;
  risks: boolean;
  complexity: boolean;
}

function parseArgs(): { diff?: string; mode: AnalysisMode; prTitle?: string; diffCommand?: string; useAgent?: boolean } {
  const args = process.argv.slice(2);
  let diff: string | undefined;
  let prTitle: string | undefined;
  let diffCommand: string | undefined;
  let useAgent: boolean = false;
  const mode: AnalysisMode = { summary: false, risks: false, complexity: false };
  
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
              console.error(chalk.red.bold(`❌  Unknown command: ${command}`));
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
          diff = readFileSync(filePath, 'utf-8');
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
      case '--agent':
        useAgent = true;
        break;
    }
  }
  
  // If no mode specified, default to full
  if (!mode.summary && !mode.risks && !mode.complexity) {
    mode.summary = true;
    mode.risks = true;
    mode.complexity = true;
  }
  
  return { diff, mode, prTitle, diffCommand, useAgent };
}

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

async function getUntrackedFiles(): Promise<string[]> {
  try {
    const output = execSync('git ls-files --others --exclude-standard', { 
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
    return output.trim().split('\n').filter(f => f.length > 0 && !shouldSkipFile(f));
  } catch (error) {
    return [];
  }
}

async function getGitDiffWithCommand(command?: string): Promise<string> {
  try {
    let diff: string = '';
    const maxBuffer = 200 * 1024 * 1024; // 200MB
    
    if (!command || command === 'origin/main') {
      try {
        diff = execSync('git diff origin/main', { 
          encoding: 'utf-8',
          maxBuffer
        });
    } catch {
      // Fallback to main branch
      console.log(chalk.yellow('⚠️  origin/main not found, trying main branch...'));
      diff = execSync('git diff main', { 
        encoding: 'utf-8',
        maxBuffer
      });
    }
    } else if (command === 'staged') {
      diff = execSync('git diff --staged', { 
        encoding: 'utf-8',
        maxBuffer
      });
    } else {
      // Custom branch or reference
      diff = execSync(`git diff ${command}`, { 
        encoding: 'utf-8',
        maxBuffer
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
      const fs = require('fs');
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
          // Optionally add a binary file marker
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


function estimateDiffSize(diff: string): number {
  // Rough estimate: 1 character ≈ 0.25 tokens
  return Math.ceil(diff.length / 4);
}

async function main() {
  // Show welcome banner
  console.log(chalk.cyan.bold('\n🤖  PR Agent - AI Code Analyzer\n'));

  if (!apiKey) {
    console.error(chalk.red.bold('❌  Error: ANTHROPIC_API_KEY environment variable is not set'));
    console.error(chalk.yellow('💡  Please set it with: export ANTHROPIC_API_KEY="your-api-key"'));
    process.exit(1);
  }
  
  const { diff, mode, prTitle, diffCommand, useAgent } = parseArgs();
  
  // Get the diff
  let finalDiff: string;
  console.log(chalk.blue('📥  Fetching diff...'));
  if (diff) {
    finalDiff = diff;
  } else if (diffCommand) {
    finalDiff = await getGitDiffWithCommand(diffCommand);
  } else {
    finalDiff = await getGitDiffWithCommand();
  }
  
  const finalTitle = prTitle || await getPRTitle();
  
  if (!finalDiff) {
    console.error(chalk.red.bold('❌  Error: No diff found'));
    process.exit(1);
  }
  
  // Estimate token count
  const estimatedTokens = estimateDiffSize(finalDiff);
  console.log(chalk.green(`✅  Diff ready: ~${estimatedTokens.toLocaleString()} tokens (${(finalDiff.length / 1024).toFixed(0)}KB)`));

  if (useAgent || finalDiff.length > 50000) {
    // Use intelligent agent for large diffs or if explicitly requested
    console.log(chalk.magenta.bold('\n🤖  Using Intelligent Agent Analysis (handling large diffs without chunking)...\n'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    try {
      const agentConfig: AIProviderConfig = {
        provider: 'claude',
        model: 'claude-sonnet-4-5-20250929',
        maxTokens: 2000,
        temperature: 0.2,
        apiKey: apiKey
      };

      const agent = new PRAnalysisAgent(agentConfig, apiKey!);
      const result = await agent.analyze(finalDiff, finalTitle, mode, 'terminal');

      // Display results based on mode
      console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.green.bold('\n✨  Agent Analysis Complete!\n'));
      
      // Clean summary - remove markdown headers and duplicates
      let cleanSummary = result.summary;
      // Remove markdown headers from summary
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
        const fileEntries = Array.from(result.fileAnalyses.entries());
        const filesWithRisks = fileEntries.filter(([_, analysis]) => analysis.risks.length > 0);
        
        if (filesWithRisks.length > 0) {
          console.log(chalk.yellow.bold(`⚠️  Risks by File (${filesWithRisks.length} files with risks)\n`));
          
          filesWithRisks.forEach(([path, analysis]) => {
            console.log(chalk.cyan(`  ${path}`));
            analysis.risks.forEach((risk, i) => {
              // Extract file reference from risk if present, otherwise use current file
              const cleanRisk = risk.replace(/^\[File: [^\]]+\]\s*/, '');
              console.log(chalk.white(`    ${i + 1}. ${cleanRisk}`));
            });
            console.log('');
          });
        } else if (result.overallRisks.length > 0) {
          // Fallback to overall risks if no file-level risks
          console.log(chalk.yellow.bold('⚠️  Overall Risks\n'));
          result.overallRisks.forEach((risk, i) => {
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

      // Show recommendations if available
      if (result.recommendations.length > 0) {
        console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.cyan.bold('\n💡 Recommendations\n'));
        result.recommendations.forEach((rec, i) => {
          console.log(chalk.white(`  ${i + 1}. ${rec}`));
        });
        console.log('\n');
      }

      // Show agent reasoning if available (minimal)
      if (result.reasoning.length > 0 && result.reasoning.length <= 5) {
        console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.cyan.bold('\n🤔 Analysis Strategy\n'));
        result.reasoning.forEach((reason, i) => {
          // Extract just the strategy summary, not all iterations
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
    } catch (error: any) {
      console.error(chalk.red.bold('\n❌  Agent analysis failed:'), error.message);
      if (error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  } else {
    // Use traditional analysis for small diffs
    console.log(chalk.magenta.bold('\n🔍  Analyzing code with Claude AI...\n'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    
    try {
      const analysis = await analyzeWithClaude(finalDiff, finalTitle, apiKey);
      console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.green.bold('\n✨  Analysis Complete!\n'));
      
      // Filter output based on mode
      const lines = analysis.split('\n');
      let output = '';
      let currentSection = '';
      
      for (const line of lines) {
        if (line.startsWith('### Summary') && mode.summary) {
          currentSection = 'summary';
          output += line + '\n';
        } else if (line.startsWith('### Potential Risks') && mode.risks) {
          currentSection = 'risks';
          output += line + '\n';
        } else if (line.startsWith('### Complexity') && mode.complexity) {
          currentSection = 'complexity';
          output += line + '\n';
        } else if (line.startsWith('###')) {
          currentSection = '';
        } else if (currentSection && (currentSection === 'summary' || currentSection === 'risks' || currentSection === 'complexity')) {
          output += line + '\n';
        }
      }
      
      console.log(chalk.white(output.trim()));
      console.log(chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    } catch (error: any) {
      if (error.message && error.message.includes('rate-limits')) {
        console.error(chalk.red.bold('\n❌  Rate limit error: Your diff is too large for the API.'));
        console.error(chalk.yellow('\n💡  Try using --agent flag for intelligent analysis of large diffs'));
      } else {
        console.error(chalk.red.bold('\n❌  Error during analysis:'), error);
      }
      process.exit(1);
    }
  }
}

main();