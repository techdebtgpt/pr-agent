import { Probot } from 'probot';
import { analyzeWithClaude } from './analyzer';
import { suggestFixFromComment } from './actions/code-suggestion/codesugestions';

const apiKey = process.env.ANTHROPIC_API_KEY;

export = (app: Probot) => {
  app.log.info('🤖 TDGPT started');

  app.on(['pull_request.opened', 'pull_request.synchronize'], async (context) => {
    const { pull_request: pr, repository } = context.payload;
    
    app.log.info(`Analyzing PR #${pr.number} in ${repository.full_name}`);

    try {
      app.log.info('Getting PR diffs');
      const diff = await getPRDiffs(context);

      
      if (!apiKey) {
        throw new Error('Anthropic API key is not set');
      }

      const summary = await analyzeWithClaude(diff, pr.title, apiKey);
      
      await context.octokit.issues.createComment({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: pr.number,
        body: `## 🤖 AI Analysis\n\n${summary}`
      });

      app.log.info(`Analysis posted for PR #${pr.number}`);

    } catch (error) {
      app.log.error('Error analyzing PR:', error);
    }
  });

  app.on(['pull_request_review_comment.created', 'pull_request_review_comment.edited'], async (context) => {
    const { comment, pull_request: pr, repository } = context.payload;
    const octokit = context.octokit;

    // Prevent infinite loop: ignore comments from bots (including our own)
    // Check both comment.user.type and sender type to catch all bot comments
    const isBotComment = comment.user.type === 'Bot' || 
                         context.payload.sender?.type === 'Bot' ||
                         (comment.user.login && comment.user.login.includes('[bot]'));
    
    if (isBotComment) {
      app.log.info(`Skipping bot comment #${comment.id} from ${comment.user.login} to prevent infinite loop`);
      return;
    }

    app.log.info(`Analyzing review comment #${comment.id} in PR #${pr.number} in ${repository.full_name}`);

    try {
      if (!comment.path) {
        app.log.warn('Review comment has no path, skipping');
        return;
      }

      if (!apiKey) {
        throw new Error('Anthropic API key is not set');
      }

      const contentResp = await octokit.rest.repos.getContent({
        owner: repository.owner.login,
        repo: repository.name,
        path: comment.path,
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

      const suggestion = await suggestFixFromComment({
        pr,
        reviewerComment: comment.body,
        filePath: comment.path,
        codeSnippet: fileContent,
        apiKey: apiKey
      });

      if (suggestion && suggestion.trim() !== 'NO CHANGE') {
        await octokit.rest.pulls.createReviewComment({
          owner: repository.owner.login,
          repo: repository.name,
          pull_number: pr.number,
          body: `### 🤖 AI suggested fix\n\n\`\`\`\n${suggestion}\n\`\`\``,
          in_reply_to: comment.id,
          commit_id: pr.head.sha,
          path: comment.path,
          line: comment.line || comment.original_line || undefined
        });

        app.log.info(`Posted AI suggestion reply for comment #${comment.id} in ${comment.path}`);
      }
    } catch (error: any) {
      app.log.error(`Error analyzing review comment #${comment.id}:`, error);
    }
  });
};

async function getPRDiffs(context: any): Promise<string> {
  try {
    const { pull_request: pr, repository } = context.payload;
    
    const { data: files } = await context.octokit.pulls.listFiles({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pr.number
    });
    
    const diff = files.map((f: any) => `--- ${f.filename}\n${f.patch}`).join('\n');
    return diff;
  } catch (error) {
    console.error('Error fetching PR diff:', error);
    throw new Error('Failed to fetch PR diff');
  }
}
