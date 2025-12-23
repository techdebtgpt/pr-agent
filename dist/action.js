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
        // Format for quick reading (1 minute scan)
        let summary = '';
        const criticalFixes = result.fixes?.filter((f) => f.severity === 'critical') || [];
        const warningFixes = result.fixes?.filter((f) => f.severity === 'warning') || [];
        const totalFixes = result.fixes?.length || 0;
        // Concise summary
        if (result.summary) {
            summary += `### 📋 Summary\n${result.summary}\n\n`;
        }
        const allActions = [];
        if (totalFixes > 0) {
            const topFixes = [...criticalFixes, ...warningFixes].slice(0, 5);
            topFixes.forEach((fix) => {
                allActions.push({
                    type: 'fix',
                    content: fix,
                    source: fix.source || 'ai',
                });
            });
        }
        // Add recommendations (from AI)
        if (result.recommendations && result.recommendations.length > 0) {
            result.recommendations.slice(0, 3).forEach((rec) => {
                allActions.push({
                    type: 'recommendation',
                    content: rec,
                    source: 'ai',
                });
            });
        }
        if (allActions.length > 0) {
            summary += `### 💡 Quick Actions\n\n`;
            let actionIndex = 1;
            allActions.forEach((action) => {
                if (action.type === 'fix') {
                    const fix = action.content;
                    const severityIcon = fix.severity === 'critical' ? '🔴' : '🟡';
                    const severityLabel = fix.severity === 'critical' ? 'CRITICAL' : 'WARNING';
                    const sourceLabel = action.source === 'semgrep' ? ' [Semgrep]' : ' [AI]';
                    const shortComment = fix.comment.split('\n')[0].substring(0, 150);
                    // Format exactly like Semgrep: Number. Icon `file:line` - LABEL [Source]
                    summary += `  ${actionIndex}. ${severityIcon} \`${fix.file}:${fix.line}\` - ${severityLabel}${sourceLabel}\n`;
                    // Indented comment line
                    summary += `     ${shortComment}${fix.comment.length > 150 ? '...' : ''}\n\n`;
                }
                else {
                    // Format recommendations to match Semgrep format
                    const rec = action.content;
                    const sourceLabel = action.source === 'semgrep' ? ' [Semgrep]' : ' [AI]';
                    // Parse recommendation to extract severity
                    let severityIcon = '🟡';
                    let severityLabel = 'WARNING';
                    let recText = rec;
                    // Check if recommendation starts with **CRITICAL: or **WARNING:
                    if (rec.match(/^\*\*CRITICAL:/i)) {
                        severityIcon = '🔴';
                        severityLabel = 'CRITICAL';
                        recText = rec.replace(/^\*\*CRITICAL:\s*/i, '').replace(/\*\*/g, '');
                    }
                    else if (rec.match(/^\*\*WARNING:/i)) {
                        severityIcon = '🟡';
                        severityLabel = 'WARNING';
                        recText = rec.replace(/^\*\*WARNING:\s*/i, '').replace(/\*\*/g, '');
                    }
                    else if (rec.toLowerCase().includes('critical')) {
                        severityIcon = '🔴';
                        severityLabel = 'CRITICAL';
                    }
                    // Format exactly like Semgrep: Number. Icon - LABEL [Source]
                    summary += `  ${actionIndex}. ${severityIcon} - ${severityLabel}${sourceLabel}\n`;
                    // Indented comment line with severity prefix
                    summary += `     ${severityIcon} **${severityLabel === 'CRITICAL' ? 'Critical' : 'Warning'}**: ${recText.substring(0, 150)}${recText.length > 150 ? '...' : ''}\n\n`;
                }
                actionIndex++;
            });
            if (totalFixes > 5) {
                summary += `_${totalFixes - 5} more issues found._\n\n`;
            }
        }
        else {
            summary += `### ✅ Status\n\nNo critical issues found.\n\n`;
        }
        // Token count at the end
        if (result.totalTokensUsed) {
            summary += `\n---\n_Total tokens used: ${result.totalTokensUsed.toLocaleString()}_`;
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