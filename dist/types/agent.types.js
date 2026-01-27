/**
 * Agent types and interfaces for PR Agent
 * Following architecture-doc-generator patterns
 */
/**
 * Execution mode for LLM-agnostic operation
 */
export var ExecutionMode;
(function (ExecutionMode) {
    ExecutionMode["EXECUTE"] = "execute";
    ExecutionMode["PROMPT_ONLY"] = "prompt_only";
})(ExecutionMode || (ExecutionMode = {}));
export var AgentPriority;
(function (AgentPriority) {
    AgentPriority["HIGH"] = "high";
    AgentPriority["MEDIUM"] = "medium";
    AgentPriority["LOW"] = "low";
})(AgentPriority || (AgentPriority = {}));
//# sourceMappingURL=agent.types.js.map