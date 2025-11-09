/**
 * LangGraph Agent Workflow for PR Analysis
 * Defines the agent nodes and graph structure
 */
/**
 * Create the agent executor with LangGraph
 */
export declare function createPRAnalysisAgent(apiKey: string, model?: string): Promise<import("@langchain/langgraph").CompiledStateGraph<any, any, "__start__" | "plan" | "agent" | "tools" | "synthesis", any, any, import("@langchain/langgraph").StateDefinition, {
    plan: any;
    agent: any;
    tools: any;
    synthesis: any;
}, unknown, unknown>>;
