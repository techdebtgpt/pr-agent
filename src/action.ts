import * as core from '@actions/core';
import * as github from '@actions/github';
import { analyzeWithClaude } from './analyzer';
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
    // Analyze with Claude
    const summary = await analyzeWithClaude(diff, pr.title, apiKey);

    // Post comment
    await postComment(context, pr.number, summary, repository!, ghToken);

    core.info(`Analysis posted for PR #${pr.number}`);
    // Optional: generate code suggestions for inline review comments
    const enableCodeSuggestions = core.getInput('enable-code-suggestions') === 'true';
    if (
      enableCodeSuggestions &&
      repository?.owner?.login &&
      repository?.name
    ) {
      try {
        const { data: reviewComments } = await octokit.rest.pulls.listReviewComments({
          owner: repository.owner.login,
          repo: repository.name,
          pull_number: pr.number
        });

        for (const rc of reviewComments) {
          if (!rc.path || !rc.body) continue;

          try {
            // Get file content at PR head
            const contentResp = await octokit.rest.repos.getContent({
              owner: repository.owner.login,
              repo: repository.name,
              path: rc.path,
              ref: pr.head.sha
            });

            let fileContent = '';
            const data = contentResp.data as any;
            if (Array.isArray(data) && data.length > 0) {
              fileContent = data[0].content ?? '';
              if (data[0].encoding === 'base64') fileContent = Buffer.from(fileContent, 'base64').toString('utf8');
            } else if (data.content) {
              fileContent = data.content;
              if (data.encoding === 'base64') fileContent = Buffer.from(fileContent, 'base64').toString('utf8');
            }

            // Ask Claude for a fix using existing analyzer wrapper
            const suggestion = await suggestFixFromComment({
              pr,
              reviewerComment: rc.body,
              filePath: rc.path,
              codeSnippet: fileContent,
              apiKey: apiKey
            });

            if (suggestion && suggestion.trim() !== 'NO CHANGE') {
              // Post suggestion as a PR comment (conservative, non-destructive)
              await octokit.rest.issues.createComment({
                owner: repository.owner.login,
                repo: repository.name,
                issue_number: pr.number,
                body: `### 🤖 AI suggested fix for \`${rc.path}\` (based on reviewer comment)\n\n\`\`\`\n${suggestion}\n\`\`\``
              });

              core.info(`Posted AI suggestion for ${rc.path}`);
            } else {
              core.info(`No change suggested for ${rc.path}`);
            }
          } catch (innerErr) {
            core.error(`Error processing review comment for ${rc.path}: ${String(innerErr)}`);
            // continue to next review comment
          }
        }
      } catch (err) {
        core.error('Failed to generate code suggestions:');
        core.error(String(err));
      }
    }
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

