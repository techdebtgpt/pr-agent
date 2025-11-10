import { PRAnalyzerAgent } from './agents/pr-analyzer-agent.js';
const apiKey = process.env.ANTHROPIC_API_KEY;
function formatAnalysisForGitHub(result) {
    let output = '';
    if (result.summary) {
        output += `### 📋 Summary\n${result.summary}\n\n`;
    }
    if (result.overallRisks && result.overallRisks.length > 0) {
        output += `### ⚠️ Risks Identified\n`;
        result.overallRisks.forEach((risk, i) => {
            output += `${i + 1}. ${risk}\n`;
        });
        output += '\n';
    }
    if (result.overallComplexity) {
        output += `### 📊 Complexity Score: ${result.overallComplexity}/5\n\n`;
    }
    if (result.recommendations && result.recommendations.length > 0) {
        output += `### 💡 Recommendations\n`;
        result.recommendations.forEach((rec, i) => {
            output += `${i + 1}. ${rec}\n`;
        });
        output += '\n';
    }
    if (result.fileAnalyses && result.fileAnalyses.size > 0) {
        const files = Array.from(result.fileAnalyses.entries());
        const sortedFiles = files
            .sort((a, b) => b[1].complexity - a[1].complexity)
            .slice(0, 5);
        if (sortedFiles.length > 0) {
            output += `### 📁 Files of Interest\n`;
            sortedFiles.forEach(([path, analysis]) => {
                output += `- **${path}** (complexity: ${analysis.complexity}/5)\n`;
                if (analysis.risks && analysis.risks.length > 0) {
                    output += `  - ⚠️ ${analysis.risks.join(', ')}\n`;
                }
            });
        }
    }
    return output;
}
export default (app) => {
    app.log.info('🤖 PR Agent (LangChain) started');
    app.on(['pull_request.opened', 'pull_request.synchronize'], async (context) => {
        const { pull_request: pr, repository } = context.payload;
        app.log.info(`Analyzing PR #${pr.number} in ${repository.full_name}`);
        try {
            app.log.info('Getting PR diffs');
            const diff = await getPRDiffs(context);
            if (!apiKey) {
                throw new Error('Anthropic API key is not set');
            }
            app.log.info('Running LangChain agent analysis...');
            const agent = new PRAnalyzerAgent(apiKey);
            const result = await agent.analyze(diff, pr.title);
            const summary = formatAnalysisForGitHub(result);
            await context.octokit.issues.createComment({
                owner: repository.owner.login,
                repo: repository.name,
                issue_number: pr.number,
                body: `## 🤖 AI Analysis (LangChain Agent)\n\n${summary}`
            });
            app.log.info(`Analysis posted for PR #${pr.number}`);
        }
        catch (error) {
            app.log.error('Error analyzing PR:', error);
        }
    });
};
async function getPRDiffs(context) {
    try {
        const { pull_request: pr, repository } = context.payload;
        const { data: files } = await context.octokit.pulls.listFiles({
            owner: repository.owner.login,
            repo: repository.name,
            pull_number: pr.number
        });
        const diff = files.map((f) => `--- ${f.filename}\n${f.patch}`).join('\n');
        return diff;
    }
    catch (error) {
        console.error('Error fetching PR diff:', error);
        throw new Error('Failed to fetch PR diff');
    }
}
//# sourceMappingURL=index.js.map