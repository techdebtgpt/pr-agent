import Anthropic from '@anthropic-ai/sdk';

export async function analyzeWithClaude(diff: string, title?: string, apiKey?: string): Promise<string> {
    const anthropic = new Anthropic({
        apiKey: apiKey,
    });
    try {
        const prompt = `
            [ROLE] You are an expert software engineer and code reviewer. Your task is to analyze a GitHub pull request (PR) and provide a clear, actionable summary for reviewers.
    
            [CONTEXT] 
            The following is the diff of the PR that needs reviewing:
            ${diff}
            ${title ? `PR Title: ${title}` : ''}
            
            [TASK] Analyze the PR and provide a concise, structured response following the guidelines below.
            
            [GUIDELINES]
            1. Provide a **Summary**: briefly describe what the change does and its purpose.
            2. Identify **Potential Risks**: list possible bugs, edge cases, or issues. Write "None" if no risks are apparent.
            3. Rate **Complexity (1–5)**:
               - 1 = trivial (small, safe, no risk)  
               - 3 = moderate (requires some attention, medium risk)  
               - 5 = very complex (large change, high risk, needs deep review)
            4. Keep the response under 200 words.
            5. Focus on clarity and actionable insights relevant for reviewers.
            6. Reference specific files or sections in the diff if needed.
            7. Use Markdown for formatting.
            8. Do not include generic introductions like "Let's analyze this PR".
            9. Start directly with the analysis and be detailed.
           `;

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            temperature: 0.2,
            messages: [{role: 'user', content: prompt}]
        });

        const text = response.content
            .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
            .map(block => block.text)
            .join('');

        return text || 'Analysis failed';

    } catch (error) {
        console.error('Claude analysis failed:', error);
        return 'Sorry, AI analysis is temporarily unavailable.';
    }
}
