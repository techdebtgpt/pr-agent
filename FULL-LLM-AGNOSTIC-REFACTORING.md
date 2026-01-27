# Full LLM-Agnostic Refactoring Plan

## Goal
Make ALL AI analysis work without API keys in MCP mode while preserving 100% CLI functionality.

## Problem
Currently, the MCP server uses StubChatModel which returns empty responses, causing:
- Empty/zero analysis results
- No data in dashboard
- Poor user experience

Only peer review was refactored to be LLM-agnostic. The main PR analysis workflow still requires API keys.

## Solution
Apply the same two-mode architecture to **ALL** LLM-based analysis:

### Mode 1: EXECUTE (CLI)
- Input: LLM instance with API key
- Process: Build prompts AND execute them via LLM
- Output: Analyzed results (summaries, risks, complexity, recommendations)

### Mode 2: PROMPT_ONLY (MCP)
- Input: No LLM needed (no API keys)
- Process: Build prompts but DON'T execute
- Output: Structured prompts for calling LLM to execute

## Current LLM Usage Points

### 1. BasePRAgentWorkflow (4 LLM invocations)
**File:** `src/agents/base-pr-agent-workflow.ts`

#### a) analyzeFileNode() - Line ~604
```typescript
const response = await this.model.invoke(fileDetailsPrompt);
```
**Purpose:** Analyzes individual files for changes, patterns, and impact
**Output:** FileAnalysis with summary, changes, risks, complexity

#### b) detectRisksNode() - Line ~785
```typescript
const response = await this.model.invoke(riskPrompt);
```
**Purpose:** Detects security/quality risks across all files
**Output:** Array of Fix objects with severity, file, comment

#### c) generateSummaryNode() - Line ~1019
```typescript
const response = await this.model.invoke(summaryPrompt);
```
**Purpose:** Generates overall PR summary
**Output:** String summary (3-5 paragraphs)

#### d) selfRefineNode() - Line ~1133
```typescript
const response = await this.model.invoke(refinementPrompt);
```
**Purpose:** Provides improvement recommendations
**Output:** Array of recommendation strings

### 2. JiraSubAgent (3 LLM invocations)
**File:** `src/agents/jira-sub-agent.ts`

✅ **ALREADY REFACTORED** in previous work:
- Ticket quality rating
- Acceptance criteria validation
- Peer review analysis

### 3. Unnecessary Classes
**Files to REMOVE:**
- `src/mcp/stub-chat-model.ts` - Returns empty responses, no longer needed
- `src/mcp/mcp-chat-model.ts` - May not be needed with prompt approach

## Implementation Plan

### Phase 1: Core Type Definitions

#### 1.1 Create Execution Mode Enum (Shared)
```typescript
// src/types/agent.types.ts
export enum AnalysisMode {
  EXECUTE = 'execute',      // CLI: Execute prompts with API key
  PROMPT_ONLY = 'prompt_only' // MCP: Return prompts for calling LLM
}
```

#### 1.2 Create Prompt Structures
```typescript
// src/types/agent.types.ts
export interface AnalysisPrompt {
  step: 'fileAnalysis' | 'riskDetection' | 'summaryGeneration' | 'selfRefinement';
  prompt: string;  // The filled-in prompt template
  context?: Record<string, any>;  // Any additional context needed
  instructions: string;  // How to execute this prompt
}

export interface PromptOnlyResult {
  mode: 'prompt_only';
  context: AgentContext;  // All input data
  prompts: AnalysisPrompt[];  // Prompts for calling LLM
  instructions: string;  // How to execute all prompts
}

// Extend existing AgentResult
export type AgentResultOrPrompts = AgentResult | PromptOnlyResult;
```

### Phase 2: Refactor BasePRAgentWorkflow

#### 2.1 Update Constructor
```typescript
export abstract class BasePRAgentWorkflow {
  protected model?: BaseChatModel;  // Now optional!
  protected mode: AnalysisMode;

  constructor(mode: AnalysisMode = AnalysisMode.EXECUTE, model?: BaseChatModel) {
    this.mode = mode;
    this.model = model;

    if (mode === AnalysisMode.EXECUTE && !model) {
      throw new Error('BasePRAgentWorkflow: LLM is required when mode is EXECUTE');
    }

    // ... rest of constructor
  }
}
```

#### 2.2 Add Main Routing Method
```typescript
async analyze(
  diff: string,
  title?: string,
  mode?: AnalysisOptions,
  options?: ExecutionOptions
): Promise<AgentResultOrPrompts> {
  if (this.mode === AnalysisMode.PROMPT_ONLY) {
    return this.buildAllPrompts(diff, title, mode, options);
  } else {
    return this.executeAnalysis(diff, title, mode, options);
  }
}
```

#### 2.3 Create Prompt Builder Methods
```typescript
private buildAllPrompts(
  diff: string,
  title?: string,
  mode?: AnalysisOptions,
  options?: ExecutionOptions
): PromptOnlyResult {
  const files = parseDiff(diff);
  const context: AgentContext = {
    diff,
    title,
    files,
    // ... other context
  };

  const prompts: AnalysisPrompt[] = [];

  // Build all 4 prompts
  files.forEach(file => {
    prompts.push(this.buildFileAnalysisPrompt(file, context));
  });
  prompts.push(this.buildRiskDetectionPrompt(files, context));
  prompts.push(this.buildSummaryPrompt(files, context));
  prompts.push(this.buildRefinementPrompt(files, context));

  return {
    mode: 'prompt_only',
    context,
    prompts,
    instructions: 'Execute these prompts sequentially to complete PR analysis...'
  };
}

private buildFileAnalysisPrompt(file: DiffFile, context: AgentContext): AnalysisPrompt {
  // Extract existing prompt logic from analyzeFileNode
  const prompt = `You are analyzing a code change in a pull request...
${file.path}
${file.diff}
...`;

  return {
    step: 'fileAnalysis',
    prompt,
    context: { file: file.path },
    instructions: 'Analyze this file and return structured FileAnalysis JSON'
  };
}

private buildRiskDetectionPrompt(files: DiffFile[], context: AgentContext): AnalysisPrompt {
  // Extract existing prompt logic from detectRisksNode
  const prompt = `You are a security and code quality expert...`;

  return {
    step: 'riskDetection',
    prompt,
    context: { fileCount: files.length },
    instructions: 'Detect risks and return array of Fix objects'
  };
}

private buildSummaryPrompt(files: DiffFile[], context: AgentContext): AnalysisPrompt {
  // Extract existing prompt logic from generateSummaryNode
  const prompt = `Generate a comprehensive PR summary...`;

  return {
    step: 'summaryGeneration',
    prompt,
    context: {},
    instructions: 'Generate detailed PR summary (3-5 paragraphs)'
  };
}

private buildRefinementPrompt(files: DiffFile[], context: AgentContext): AnalysisPrompt {
  // Extract existing prompt logic from selfRefineNode
  const prompt = `Review the analysis and suggest improvements...`;

  return {
    step: 'selfRefinement',
    prompt,
    context: {},
    instructions: 'Provide 3-5 actionable recommendations'
  };
}
```

#### 2.4 Rename/Update Execution Methods
```typescript
// Rename execute() to executeAnalysis()
private async executeAnalysis(
  diff: string,
  title?: string,
  mode?: AnalysisOptions,
  options?: ExecutionOptions
): Promise<AgentResult> {
  // Original execute() logic - UNCHANGED
  // Just add LLM guards in each node
}

// Add LLM guards to all invoke methods
private async analyzeFileNode(state: typeof PRAgentState.State) {
  if (!this.model) {
    throw new Error('LLM is required for file analysis in EXECUTE mode');
  }

  // ... existing logic
  const response = await this.model.invoke(fileDetailsPrompt);
  // ...
}

// Same for detectRisksNode, generateSummaryNode, selfRefineNode
```

### Phase 3: Update PRAnalyzerAgent

```typescript
export class PRAnalyzerAgent extends BasePRAgentWorkflow {
  constructor(options: PRAnalyzerOptions = {}) {
    // Determine mode
    const mode = options.mode || AnalysisMode.EXECUTE;

    let model: BaseChatModel | undefined;

    // Only create model in EXECUTE mode
    if (mode === AnalysisMode.EXECUTE) {
      if (options.chatModel) {
        model = options.chatModel;
      } else {
        model = ProviderFactory.createChatModel({
          provider: options.provider || 'anthropic',
          apiKey: options.apiKey,
          model: options.model,
          temperature: options.temperature ?? 0.2,
          maxTokens: options.maxTokens ?? 4000,
        });
      }
    }

    super(mode, model);
  }
}

export interface PRAnalyzerOptions extends ProviderOptions {
  mode?: AnalysisMode;
  chatModel?: BaseChatModel;
}
```

### Phase 4: Update CLI (analyze.command.ts)

```typescript
// Add mode to options (always EXECUTE for CLI)
const agent = new PRAnalyzerAgent({
  provider: providerOptions.provider,
  apiKey: providerOptions.apiKey,
  model: providerOptions.model,
  temperature: 0.2,
  maxTokens: 4000,
  mode: AnalysisMode.EXECUTE,  // <-- CLI always executes
});

const result = await agent.analyze(diff, title, analysisMode, options);

// Type guard - CLI should never get PromptOnlyResult
if (result.mode === 'prompt_only') {
  throw new Error('Unexpected prompt-only result in CLI');
}

// Use result as AgentResult
const agentResult = result as AgentResult;
```

### Phase 5: Update MCP Server

```typescript
// Use PROMPT_ONLY mode - no LLM, no API keys
const agent = new PRAnalyzerAgent({
  mode: AnalysisMode.PROMPT_ONLY,  // <-- MCP returns prompts
});

const result = await agent.analyze(diff, title, analysisMode, options);

// Type guard - check mode
if (result.mode === 'prompt_only') {
  // Format prompts for calling LLM
  return {
    content: [{
      type: 'text',
      text: formatAllPromptsForLLM(result)
    }]
  };
} else {
  // Should not happen in MCP with PROMPT_ONLY mode
  throw new Error('Expected prompt-only result');
}
```

#### 5.1 Create Prompt Formatter
```typescript
function formatAllPromptsForLLM(result: PromptOnlyResult): string {
  const lines: string[] = [];

  lines.push('🤖 PR Agent Analysis Prompts (LLM-Agnostic Mode)');
  lines.push('');
  lines.push('Execute the following prompts sequentially:');
  lines.push('');

  result.prompts.forEach((prompt, i) => {
    const stepName = {
      'fileAnalysis': '1️⃣ File Analysis',
      'riskDetection': '2️⃣ Risk Detection',
      'summaryGeneration': '3️⃣ Summary Generation',
      'selfRefinement': '4️⃣ Self Refinement'
    }[prompt.step];

    lines.push(`${stepName}`);
    lines.push('');
    lines.push('```');
    lines.push(prompt.prompt);
    lines.push('```');
    lines.push('');
    lines.push(`Instructions: ${prompt.instructions}`);
    lines.push('');
  });

  return lines.join('\n');
}
```

### Phase 6: Remove Unnecessary Classes

#### 6.1 Delete StubChatModel
```bash
rm src/mcp/stub-chat-model.ts
```

#### 6.2 Delete MCPChatModel
```bash
rm src/mcp/mcp-chat-model.ts
```

#### 6.3 Update Imports
Remove all imports of StubChatModel and MCPChatModel from:
- `src/mcp/server.ts`
- Any test files

### Phase 7: Update Type Exports

```typescript
// src/types/agent.types.ts
export {
  AnalysisMode,
  AnalysisPrompt,
  PromptOnlyResult,
  AgentResultOrPrompts,
  // ... existing exports
};

// src/agents/index.ts
export {
  PRAnalyzerAgent,
  BasePRAgentWorkflow,
  AnalysisMode,
  // ... existing exports
};
```

## Migration Steps

1. ✅ Create new branch (already done: `feat/llm-agnostic-peer-review`)
2. ✅ Peer review refactoring complete
3. Add AnalysisMode enum and types to `agent.types.ts`
4. Refactor `BasePRAgentWorkflow`:
   - Add mode parameter to constructor
   - Make model optional
   - Extract all 4 prompt building methods
   - Add buildAllPrompts() method
   - Rename execute() to executeAnalysis()
   - Add LLM guards to all invoke calls
5. Update `PRAnalyzerAgent`:
   - Add mode to constructor options
   - Conditionally create model based on mode
6. Update CLI (`analyze.command.ts`):
   - Pass AnalysisMode.EXECUTE
   - Add type guard for result
7. Update MCP server (`server.ts`):
   - Pass AnalysisMode.PROMPT_ONLY
   - Add formatAllPromptsForLLM()
   - Remove StubChatModel usage
8. Delete unnecessary classes:
   - `src/mcp/stub-chat-model.ts`
   - `src/mcp/mcp-chat-model.ts`
9. Update imports and exports
10. Build and test CLI workflow
11. Build and test MCP workflow

## Testing Checklist

### CLI (EXECUTE mode)
- [ ] File analysis works
- [ ] Risk detection works
- [ ] Summary generation works
- [ ] Self-refinement works
- [ ] Peer review works (already tested)
- [ ] Database saves correctly
- [ ] Output format unchanged
- [ ] All analysis modes work (summary, risks, complexity, full)

### MCP (PROMPT_ONLY mode)
- [ ] Returns structured prompts for all analysis steps
- [ ] Includes all context data
- [ ] No LLM calls attempted
- [ ] Works without API keys
- [ ] Peer review prompts included
- [ ] Dashboard can display results after calling LLM executes prompts

## Benefits

1. **MCP server works without API keys** - Uses calling LLM (Claude Code, Cursor, etc.)
2. **CLI unchanged** - Still uses API keys, full backward compatibility
3. **Consistent architecture** - Same pattern for all AI analysis
4. **Cleaner codebase** - Remove StubChatModel hack
5. **Future-proof** - When MCP sampling arrives, easy to integrate

## Rollback Plan

If issues arise:
1. Revert branch to main
2. All CLI functionality unchanged on main
3. MCP server will have stub data (current state)
