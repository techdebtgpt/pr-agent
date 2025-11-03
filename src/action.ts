import * as core from '@actions/core';
import * as github from '@actions/github';
import { PRAnalysisAgent } from './pr-agent';
import { AIProviderConfig } from './providers/types';
import { suggestFixFromComment, prepareFileReplacement } from './actions/code-suggestion/codesugestions';

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
    
    const octokit = github.getOctokit(ghToken);
    
    // Use PRAnalysisAgent with GitHub API access for import checking
    // Use higher maxTokens for GitHub Actions to get full analysis
    const agentConfig: AIProviderConfig = {
      provider: 'claude',
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 8000, // Increased for full analysis in GitHub Actions
      temperature: 0.2,
      apiKey: apiKey
    };

    if (!repository) {
      core.setFailed('Repository information not available');
      return;
    }

    const agent = new PRAnalysisAgent(
      agentConfig,
      apiKey,
      octokit,
      {
        owner: repository.owner.login,
        repo: repository.name,
        baseSha: pr.base.sha,
        headSha: pr.head.sha
      }
    );

    // Analyze with the agent (includes import checking via GitHub API)
    const result = await agent.analyze(diff, pr.title, { summary: true, risks: true, complexity: true }, 'markdown');

    // Format the summary - remove any existing headers to avoid duplication
    let cleanSummary = result.summary
      .replace(/^###\s*Summary\s*\n?/i, '')
      .replace(/^Summary:\s*\n?/i, '')
      .trim();
    
    let summary = `### Summary\n${cleanSummary}\n\n`;
    
    if (result.overallRisks.length > 0) {
      summary += `### Potential Risks\n`;
      result.overallRisks.forEach(risk => {
        summary += `- ${risk}\n`;
      });
      summary += '\n';
    } else {
      summary += `### Potential Risks\nNone\n\n`;
    }
    
    summary += `### Complexity: ${result.overallComplexity}/5\n`;
    
    if (result.recommendations && result.recommendations.length > 0) {
      summary += `\n### Recommendations\n`;
      result.recommendations.forEach(rec => {
        summary += `- ${rec}\n`;
      });
    }

    // Post comment
    await postComment(context, pr.number, summary, repository!, ghToken);

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

