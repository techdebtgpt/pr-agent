"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeWithClaude = analyzeWithClaude;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
async function analyzeWithClaude(diff, title, apiKey, mode, isCLI) {
    const anthropic = new sdk_1.default({
        apiKey: apiKey,
    });
    const analyzeMode = mode || { summary: true, risks: true, complexity: true };
    try {
        const tasks = [];
        if (analyzeMode.summary) {
            tasks.push('a **Summary**: briefly describing what the change does and its purpose');
        }
        if (analyzeMode.risks) {
            tasks.push('**Potential Risks**: list possible bugs, edge cases, or issues (write "None" if no risks are apparent)');
        }
        if (analyzeMode.complexity) {
            tasks.push('**Complexity Rating (1–5)**:\n               - 1 = trivial (small, safe, no risk)\n               - 3 = moderate (requires some attention, medium risk)\n               - 5 = very complex (large change, high risk, needs deep review)');
        }
        const outputFormat = isCLI
            ? `terminal-friendly format with visual separators. Use emojis sparingly for key points. Make it easy to scan in a terminal.`
            : `Markdown format suitable for GitHub comments. Use proper Markdown headers and formatting.`;
        const prompt = `
            [ROLE] You are an expert software engineer and code reviewer. Your task is to analyze a GitHub pull request (PR) and provide a clear, actionable summary for reviewers.
    
            [CONTEXT] 
            The following is the diff of the PR that needs reviewing:
            ${diff}
            ${title ? `PR Title: ${title}` : ''}
            
            [TASK] Analyze the PR and provide the following sections: ${tasks.join(', ')}.
            
            [OUTPUT FORMAT] Format your output for ${outputFormat}
            
            [GUIDELINES]
            1. Keep the response concise and focused on the requested sections.
            2. Focus on clarity and actionable insights relevant for reviewers.
            3. Reference specific files or sections in the diff if needed.
            4. Do not include generic introductions like "Let's analyze this PR".
            5. Start directly with the analysis and be detailed.
            6. If analysis is not available or relevant, clearly state so.
           `;
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            temperature: 0.2,
            messages: [{ role: 'user', content: prompt }]
        });
        const text = response.content
            .filter((block) => block.type === 'text')
            .map(block => block.text)
            .join('');
        return text || 'Analysis failed';
    }
    catch (error) {
        if (error.message && error.message.includes('rate-limits')) {
            throw new Error('Rate limit exceeded. Please wait a few minutes or reduce the size of your diff.');
        }
        console.error('Claude analysis failed:', error);
        throw error;
    }
}
//# sourceMappingURL=analyzer.js.map