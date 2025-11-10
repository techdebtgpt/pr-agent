"use strict";
/**
 * LangGraph Agent State for PR Analysis
 * Defines the state structure that flows through the agent workflow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRAgentState = void 0;
exports.createInitialState = createInitialState;
const langgraph_1 = require("@langchain/langgraph");
/**
 * LangGraph State Annotation
 * This defines how the state is updated throughout the workflow
 */
exports.PRAgentState = langgraph_1.Annotation.Root({
    // Input fields
    diff: (langgraph_1.Annotation),
    title: (langgraph_1.Annotation),
    mode: (langgraph_1.Annotation),
    // Strategy
    strategy: (langgraph_1.Annotation),
    reasoning: (0, langgraph_1.Annotation)({
        reducer: (current, update) => [...current, ...update],
        default: () => [],
    }),
    // Parsed data
    parsedFiles: (0, langgraph_1.Annotation)({
        default: () => [],
    }),
    // File analyses
    fileAnalyses: (0, langgraph_1.Annotation)({
        reducer: (current, update) => [...current, ...update],
        default: () => [],
    }),
    // Insights
    designPatterns: (0, langgraph_1.Annotation)({
        reducer: (current, update) => [...current, ...update],
        default: () => [],
    }),
    architecturalChanges: (0, langgraph_1.Annotation)({
        reducer: (current, update) => [...current, ...update],
        default: () => [],
    }),
    overallRisks: (0, langgraph_1.Annotation)({
        reducer: (current, update) => [...current, ...update],
        default: () => [],
    }),
    // Results
    summary: (0, langgraph_1.Annotation)({
        default: () => '',
    }),
    overallComplexity: (0, langgraph_1.Annotation)({
        default: () => 0,
    }),
    recommendations: (0, langgraph_1.Annotation)({
        default: () => [],
    }),
    insights: (0, langgraph_1.Annotation)({
        reducer: (current, update) => [...current, ...update],
        default: () => [],
    }),
    // Metadata
    tokensUsed: (0, langgraph_1.Annotation)({
        reducer: (current, update) => current + update,
        default: () => 0,
    }),
    iterationCount: (0, langgraph_1.Annotation)({
        reducer: (current, update) => current + update,
        default: () => 0,
    }),
    completed: (0, langgraph_1.Annotation)({
        default: () => false,
    }),
    // Refinement
    needsRefinement: (0, langgraph_1.Annotation)({
        default: () => false,
    }),
    refinementQuestions: (0, langgraph_1.Annotation)({
        default: () => [],
    }),
});
/**
 * Initial state creator
 */
function createInitialState(diff, title, mode) {
    return {
        diff,
        title,
        mode: mode || { summary: true, risks: true, complexity: true },
        strategy: 'comprehensive',
        reasoning: [],
        parsedFiles: [],
        fileAnalyses: [],
        designPatterns: [],
        architecturalChanges: [],
        overallRisks: [],
        summary: '',
        overallComplexity: 0,
        recommendations: [],
        insights: [],
        tokensUsed: 0,
        iterationCount: 0,
        completed: false,
        needsRefinement: false,
        refinementQuestions: [],
    };
}
//# sourceMappingURL=state.js.map