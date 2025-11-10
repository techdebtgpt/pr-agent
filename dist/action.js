import * as core from '@actions/core';
import * as github from '@actions/github';
import { PRAnalyzerAgent } from './agents/pr-analyzer-agent.js';
async function run() {
    try {
        // Get provider configuration from environment
        const provider = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();
        const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY;
        const model = process.env.AI_MODEL;
        const ghToken = process.env.GITHUB_TOKEN;
        if (!apiKey) {
            core.setFailed('AI provider API key is required (ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY)');
            return;
        }
        if (!ghToken) {
            core.setFailed('GITHUB_TOKEN environment variable is required');
            return;
        }
        core.info(`Using AI provider: ${provider}${model ? ` with model: ${model}` : ''}`);
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
        core.info(`Diff size: ${diff.length} characters`);
        if (!repository) {
            core.setFailed('Repository information not available');
            return;
        }
        // Use LangChain PRAnalyzerAgent
        core.info('Running LangChain agent analysis...');
        const agent = new PRAnalyzerAgent({
            provider,
            apiKey,
            model,
        });
        // Analyze with the LangChain agent
        core.info('Parsing diff and analyzing...');
        const result = await agent.analyze(diff, pr.title);
        core.info(`Analysis complete: ${result.fileAnalyses.size} files analyzed`);
        // Format the summary
        let summary = '';
        if (result.summary) {
            summary += `### Summary\n${result.summary}\n\n`;
        }
        if (result.overallRisks.length > 0) {
            summary += `### Potential Risks\n`;
            result.overallRisks.forEach((risk) => {
                if (typeof risk === 'string') {
                    summary += `- ${risk}\n`;
                }
                else if (typeof risk === 'object' && risk.description) {
                    summary += `- **${risk.description}**\n`;
                    if (risk.archDocsReference) {
                        summary += `  - 📚 *From ${risk.archDocsReference.source}*: "${risk.archDocsReference.excerpt}"\n`;
                        summary += `  - *Reason*: ${risk.archDocsReference.reason}\n`;
                    }
                }
            });
            summary += '\n';
        }
        else {
            summary += `### Potential Risks\nNone\n\n`;
        }
        summary += `### Complexity: ${result.overallComplexity}/5\n`;
        if (result.recommendations && result.recommendations.length > 0) {
            summary += `\n### Recommendations\n`;
            result.recommendations.forEach((rec) => {
                summary += `- ${rec}\n`;
            });
        }
        // Post comment
        await postComment(pr.number, summary, repository, ghToken);
        core.info('Analysis complete!');
    }
    catch (error) {
        core.setFailed(`Action failed with error: ${error}`);
    }
}
async function getPRDiffs(context, ghToken) {
    try {
        const { pull_request: pr, repository } = context.payload;
        const octokit = github.getOctokit(ghToken);
        const { data: files } = await octokit.rest.pulls.listFiles({
            owner: repository.owner.login,
            repo: repository.name,
            pull_number: pr.number
        });
        // Format as proper git diff that parseDiff expects
        return files.map((f) => {
            const status = f.status === 'added' ? 'new file mode 100644' :
                f.status === 'removed' ? 'deleted file mode 100644' : '';
            const patch = f.patch || '';
            return `diff --git a/${f.filename} b/${f.filename}
${status ? status + '\n' : ''}--- ${f.status === 'added' ? '/dev/null' : 'a/' + f.filename}
+++ ${f.status === 'removed' ? '/dev/null' : 'b/' + f.filename}
${patch}`;
        }).join('\n');
    }
    catch (error) {
        core.error('Error fetching PR diff:');
        core.error(String(error));
        throw new Error('Failed to fetch PR diff');
    }
}
async function postComment(prNumber, summary, repository, ghToken) {
    try {
        const octokit = github.getOctokit(ghToken);
        await octokit.rest.issues.createComment({
            owner: repository.owner.login,
            repo: repository.name,
            issue_number: prNumber,
            body: `## 🤖 AI Analysis (PR Agent by TechDebtGPT)\n\n${summary}`
        });
    }
    catch (error) {
        core.error('Error posting comment:');
        core.error(String(error));
        throw new Error('Failed to post comment');
    }
}
run();
//# sourceMappingURL=action.js.map