/**
 * LangGraph Agent State for PR Analysis
 * Defines the state structure that flows through the agent workflow
 */
/**
 * Agent State Interface
 */
export interface PRAgentStateType {
    diff: string;
    title?: string;
    mode: {
        summary: boolean;
        risks: boolean;
        complexity: boolean;
    };
    strategy: 'quick' | 'comprehensive' | 'deep-dive';
    reasoning: string[];
    parsedFiles: Array<{
        path: string;
        status: string;
        additions: number;
        deletions: number;
        language?: string;
    }>;
    fileAnalyses: Array<{
        file: string;
        complexity: number;
        risks: string[];
        patterns: string[];
        changes: {
            additions: number;
            deletions: number;
            total: number;
        };
    }>;
    designPatterns: string[];
    architecturalChanges: string[];
    overallRisks: Array<{
        severity: string;
        category: string;
        description: string;
    }>;
    summary: string;
    overallComplexity: number;
    recommendations: string[];
    insights: string[];
    tokensUsed: number;
    iterationCount: number;
    completed: boolean;
    needsRefinement: boolean;
    refinementQuestions: string[];
}
/**
 * LangGraph State Annotation
 * This defines how the state is updated throughout the workflow
 */
export declare const PRAgentState: import("@langchain/langgraph").AnnotationRoot<{
    diff: {
        (): import("@langchain/langgraph").LastValue<string>;
        (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    title: {
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BinaryOperatorAggregate<string | undefined, string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    mode: {
        (): import("@langchain/langgraph").LastValue<{
            summary: boolean;
            risks: boolean;
            complexity: boolean;
        }>;
        (annotation: import("@langchain/langgraph").SingleReducer<{
            summary: boolean;
            risks: boolean;
            complexity: boolean;
        }, {
            summary: boolean;
            risks: boolean;
            complexity: boolean;
        }>): import("@langchain/langgraph").BinaryOperatorAggregate<{
            summary: boolean;
            risks: boolean;
            complexity: boolean;
        }, {
            summary: boolean;
            risks: boolean;
            complexity: boolean;
        }>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    strategy: {
        (): import("@langchain/langgraph").LastValue<"quick" | "comprehensive" | "deep-dive">;
        (annotation: import("@langchain/langgraph").SingleReducer<"quick" | "comprehensive" | "deep-dive", "quick" | "comprehensive" | "deep-dive">): import("@langchain/langgraph").BinaryOperatorAggregate<"quick" | "comprehensive" | "deep-dive", "quick" | "comprehensive" | "deep-dive">;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    reasoning: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    parsedFiles: import("@langchain/langgraph").BinaryOperatorAggregate<any[], ValueType>;
    fileAnalyses: import("@langchain/langgraph").BinaryOperatorAggregate<any[], any[]>;
    designPatterns: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    architecturalChanges: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    overallRisks: import("@langchain/langgraph").BinaryOperatorAggregate<any[], any[]>;
    summary: import("@langchain/langgraph").BinaryOperatorAggregate<string, ValueType>;
    overallComplexity: import("@langchain/langgraph").BinaryOperatorAggregate<number, ValueType>;
    recommendations: import("@langchain/langgraph").BinaryOperatorAggregate<string[], ValueType>;
    insights: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    tokensUsed: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    iterationCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    completed: import("@langchain/langgraph").BinaryOperatorAggregate<boolean, ValueType>;
    needsRefinement: import("@langchain/langgraph").BinaryOperatorAggregate<boolean, ValueType>;
    refinementQuestions: import("@langchain/langgraph").BinaryOperatorAggregate<string[], ValueType>;
}>;
/**
 * Initial state creator
 */
export declare function createInitialState(diff: string, title?: string, mode?: {
    summary: boolean;
    risks: boolean;
    complexity: boolean;
}): Partial<PRAgentStateType>;
