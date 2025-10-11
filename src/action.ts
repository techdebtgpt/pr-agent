import * as core from '@actions/core';
import * as github from '@actions/github';
import { analyzeWithClaude } from './analyzer';

async function run() {
  try {
    const configPath = core.getInput('config-path');
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

    // Analyze with Claude
    const summary = await analyzeWithClaude(diff, pr.title, apiKey);
    
    // Post comment
    await postComment(context, pr.number, summary, repository!, ghToken);
    
    core.info(`Analysis posted for PR #${pr.number}`);

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

async function postComment(context: any, prNumber: number, summary: string, repository: any, ghToken: string) {
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

