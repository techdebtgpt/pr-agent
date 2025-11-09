import * as core from '@actions/core';
import * as github from '@actions/github';
import { PRAnalyzerAgent } from './agents/pr-analyzer-agent.js';

async function run() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const ghToken = process.env.GITHUB_TOKEN;

    if (!apiKey) {
      core.setFailed('ANTHROPIC_API_KEY environment variable is required');
      return;
    }

    if (!ghToken) {
      core.setFailed('GITHUB_TOKEN environment variable is required');
      return;
    }

    const { context } = github;
    const { pull_request: pr, repository } = context.payload;

    if (!pr) {
      core.setFailed('This action can only be run on pull request events');
      return;
    }

    core.info(`Analyzing PR #${pr.number} in ${repository?.full_name}`);

    // Get PR diffs
    const diff = await getPRDiffs(context, ghToken);

    if (!diff) {
      core.warning('No changes found in the pull request');
      return;
    }
    
    if (!repository) {
      core.setFailed('Repository information not available');
      return;
    }

    // Use LangChain PRAnalyzerAgent
    core.info('Running LangChain agent analysis...');
    const agent = new PRAnalyzerAgent(apiKey, 'claude-sonnet-4-5-20250929');

    // Analyze with the LangChain agent
    const result = await agent.analyze(diff, pr.title);

    // Format the summary
    let summary = '';
    
    if (result.summary) {
      summary += `### Summary\n${result.summary}\n\n`;
    }
    
    if (result.overallRisks.length > 0) {
      summary += `### Potential Risks\n`;
      result.overallRisks.forEach((risk: string) => {
        summary += `- ${risk}\n`;
      });
      summary += '\n';
    } else {
      summary += `### Potential Risks\nNone\n\n`;
    }
    
    summary += `### Complexity: ${result.overallComplexity}/5\n`;
    
    if (result.recommendations && result.recommendations.length > 0) {
      summary += `\n### Recommendations\n`;
      result.recommendations.forEach((rec: string) => {
        summary += `- ${rec}\n`;
      });
    }

    // Post comment
    await postComment(pr.number, summary, repository, ghToken);

    core.info('Analysis complete!');

  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
  }
}

async function getPRDiffs(context: any, ghToken: string): Promise<string> {
  try {
    const { pull_request: pr, repository } = context.payload;

    const octokit = github.getOctokit(ghToken);

    const { data: files } = await octokit.rest.pulls.listFiles({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pr.number
    });

    return files.map((f: any) => `--- ${f.filename}\n${f.patch}`).join('\n');
  } catch (error) {
    core.error('Error fetching PR diff:');
    core.error(String(error));
    throw new Error('Failed to fetch PR diff');
  }
}

async function postComment(prNumber: number, summary: string, repository: any, ghToken: string) {
  try {
    const octokit = github.getOctokit(ghToken);

    await octokit.rest.issues.createComment({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: prNumber,
      body: `## 🤖 AI Analysis (PR Agent by TechDebtGPT)\n\n${summary}`
    });
  } catch (error) {
    core.error('Error posting comment:');
    core.error(String(error));
    throw new Error('Failed to post comment');
  }
}

run();
