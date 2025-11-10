"use strict";
/**
 * LangGraph Agent Workflow for PR Analysis
 * Defines the agent nodes and graph structure
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPRAnalysisAgent = createPRAnalysisAgent;
const anthropic_1 = require("@langchain/anthropic");
const langgraph_1 = require("@langchain/langgraph");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const state_1 = require("./state");
const tools_1 = require("./tools");
/**
 * Create the agent executor with LangGraph
 */
async function createPRAnalysisAgent(apiKey, model = 'claude-sonnet-4-5-20250929') {
    // Initialize the LLM with tools
    const llm = new anthropic_1.ChatAnthropic({
        anthropicApiKey: apiKey,
        modelName: model,
        temperature: 0.2,
        maxTokens: 4096,
    });
    // Bind tools to the LLM
    const llmWithTools = llm.bindTools(tools_1.prAnalysisTools);
    /**
     * Plan Node: Determine analysis strategy
     */
    async function planNode(state) {
        const reasoning = [];
        let strategy = 'comprehensive';
        // Determine strategy based on diff size and complexity
        const diffSize = state.diff.length;
        const fileCount = (state.diff.match(/^diff --git /gm) || []).length;
        if (diffSize < 5000 && fileCount <= 3) {
            strategy = 'quick';
            reasoning.push(`Quick analysis: Small PR with ${fileCount} files, ${diffSize} bytes`);
        }
        else if (diffSize > 50000 || fileCount > 20) {
            strategy = 'deep-dive';
            reasoning.push(`Deep-dive analysis: Large PR with ${fileCount} files, ${diffSize} bytes`);
        }
        else {
            strategy = 'comprehensive';
            reasoning.push(`Comprehensive analysis: Medium PR with ${fileCount} files, ${diffSize} bytes`);
        }
        return {
            strategy,
            reasoning,
            iterationCount: 1,
        };
    }
    /**
     * Agent Node: The main reasoning agent that decides which tools to call
     */
    async function agentNode(state) {
        const messages = [];
        // Build context message
        let systemPrompt = `You are an expert code reviewer analyzing a pull request.

Your goal is to:
1. Parse the diff to understand what changed
2. Analyze files for complexity and risks
3. Detect patterns and architectural changes
4. Assess overall risks
5. Generate actionable recommendations

Available tools:
- parse_diff: Parse git diff into structured file changes
- analyze_file: Deep-dive into specific files
- detect_patterns: Identify design patterns and architecture
- assess_risks: Evaluate security and breaking changes
- generate_recommendations: Create actionable feedback

Strategy: ${state.strategy}
Analysis mode: ${JSON.stringify(state.mode)}

Start by parsing the diff, then analyze important files, detect patterns, assess risks, and finally generate recommendations.`;
        messages.push({
            role: 'system',
            content: systemPrompt,
        });
        // Add user message with the diff
        const userMessage = `Please analyze this pull request${state.title ? ` titled "${state.title}"` : ''}:

\`\`\`diff
${state.diff.substring(0, 50000)}${state.diff.length > 50000 ? '\n... (diff truncated)' : ''}
\`\`\`

${state.parsedFiles.length > 0 ? `\nParsed files: ${JSON.stringify(state.parsedFiles.map((f) => ({ path: f.path, status: f.status, changes: f.additions + f.deletions })))}` : ''}
${state.fileAnalyses.length > 0 ? `\nFile analyses completed: ${state.fileAnalyses.length}` : ''}
${state.designPatterns.length > 0 ? `\nPatterns detected: ${state.designPatterns.join(', ')}` : ''}

${state.parsedFiles.length === 0 ? 'Start by using parse_diff to understand the changes.' : ''}
${state.parsedFiles.length > 0 && state.fileAnalyses.length === 0 ? 'Now analyze key files using analyze_file.' : ''}
${state.fileAnalyses.length > 0 && state.designPatterns.length === 0 ? 'Now detect patterns using detect_patterns.' : ''}
${state.designPatterns.length > 0 && state.overallRisks.length === 0 ? 'Now assess risks using assess_risks.' : ''}
${state.overallRisks.length > 0 && state.recommendations.length === 0 ? 'Finally, generate recommendations using generate_recommendations.' : ''}
`;
        messages.push({
            role: 'user',
            content: userMessage,
        });
        // Invoke the LLM with tools
        const response = await llmWithTools.invoke(messages);
        return {
            reasoning: [`Agent decision: ${response.content}`],
            tokensUsed: response.usage_metadata?.total_tokens || 0,
        };
    }
    /**
     * Tool Node: Executes the tools the agent decided to call
     */
    const toolNode = new prebuilt_1.ToolNode(tools_1.prAnalysisTools);
    /**
     * Synthesis Node: Combine all analysis results into final output
     */
    async function synthesisNode(state) {
        const messages = [
            {
                role: 'system',
                content: `You are synthesizing a PR analysis. Create a comprehensive summary based on all the analysis results.`,
            },
            {
                role: 'user',
                content: `Based on the analysis:

Files analyzed: ${state.fileAnalyses.length}
Patterns: ${state.designPatterns.join(', ')}
Risks: ${state.overallRisks.length} identified
Architecture changes: ${state.architecturalChanges.join(', ')}

${state.mode.summary ? 'Generate a clear, concise summary of the changes and their impact.' : ''}
${state.mode.complexity ? 'Calculate an overall complexity score (1-5).' : ''}
${state.mode.risks ? 'Summarize the key risks.' : ''}

Provide your response in JSON format:
{
  "summary": "...",
  "overallComplexity": 1-5,
  "keyInsights": ["..."],
  "criticalRisks": ["..."]
}`,
            },
        ];
        const response = await llm.invoke(messages);
        const content = response.content.toString();
        // Try to parse JSON response
        let result;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            }
        }
        catch (e) {
            // Fallback if JSON parsing fails
            result = {
                summary: content,
                overallComplexity: Math.min(5, Math.max(1, Math.ceil(state.fileAnalyses.length / 5))),
                keyInsights: [],
                criticalRisks: [],
            };
        }
        return {
            summary: result.summary || 'Analysis completed',
            overallComplexity: result.overallComplexity || 3,
            insights: result.keyInsights || [],
            completed: true,
            tokensUsed: response.usage_metadata?.total_tokens || 0,
        };
    }
    /**
     * Router: Determine next step based on state
     */
    function routeAgent(state) {
        // If we haven't parsed files yet, continue with agent
        if (state.parsedFiles.length === 0) {
            return 'agent';
        }
        // If we have parsed files but no analyses, continue
        if (state.fileAnalyses.length === 0) {
            return 'agent';
        }
        // If we have analyses but no patterns, continue
        if (state.designPatterns.length === 0) {
            return 'agent';
        }
        // If we have patterns but no risk assessment, continue
        if (state.overallRisks.length === 0) {
            return 'agent';
        }
        // If we have risks but no recommendations, continue
        if (state.recommendations.length === 0) {
            return 'agent';
        }
        // All analysis complete, move to synthesis
        return 'synthesis';
    }
    /**
     * Build the LangGraph workflow
     */
    const workflow = new langgraph_1.StateGraph(state_1.PRAgentState)
        // Add nodes
        .addNode('plan', planNode)
        .addNode('agent', agentNode)
        .addNode('tools', toolNode)
        .addNode('synthesis', synthesisNode)
        // Define edges
        .addEdge('__start__', 'plan')
        .addEdge('plan', 'agent')
        .addConditionalEdges('agent', routeAgent, {
        agent: 'agent',
        synthesis: 'synthesis',
    })
        .addEdge('tools', 'agent')
        .addEdge('synthesis', langgraph_1.END);
    // Compile the graph
    const app = workflow.compile();
    return app;
}
//# sourceMappingURL=workflow.js.map