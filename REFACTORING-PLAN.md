# LLM-Agnostic Peer Review Refactoring Plan

## Goal
Make peer review work without API keys in MCP mode while preserving 100% CLI functionality.

## Current Architecture

```
CLI Flow:
User → analyze.command.ts → PeerReviewIntegration(llm) → JiraSubAgent(llm)
                                                          ├── rateTicketQuality() → llm.invoke()
                                                          ├── validateAcceptanceCriteria() → llm.invoke()
                                                          └── generatePeerReview() → llm.invoke()
```

## New Architecture

### Core Principle
Separate **prompt building** (data + instructions) from **prompt execution** (LLM invocation).

### Mode-Based Operation

**Mode 1: EXECUTE (CLI)**
- Input: LLM instance with API key
- Process: Build prompts AND execute them
- Output: Analyzed results (scores, verdicts, etc.)

**Mode 2: PROMPT_ONLY (MCP)**
- Input: No LLM needed
- Process: Build prompts but DON'T execute
- Output: Structured prompts for calling LLM to execute

### Implementation Strategy

#### 1. Create Execution Mode Enum
```typescript
export enum PeerReviewMode {
  EXECUTE = 'execute',      // CLI: Execute prompts with API key
  PROMPT_ONLY = 'prompt_only' // MCP: Return prompts for calling LLM
}
```

#### 2. Create Prompt Structures
```typescript
export interface AnalysisPrompt {
  step: 'ticketQuality' | 'acValidation' | 'peerReview';
  prompt: string;  // The filled-in prompt template
  schema: ZodSchema;  // The expected output schema
  formatInstructions: string;
}

export interface PromptOnlyResult {
  mode: 'prompt_only';
  context: JiraSubAgentContext;  // All input data
  prompts: AnalysisPrompt[];  // Prompts for calling LLM
  instructions: string;  // How to execute
}
```

#### 3. Refactor JiraSubAgent

**Before:**
```typescript
class JiraSubAgent {
  constructor(llm: BaseLanguageModel) {}

  async rateTicketQuality(ticket): Promise<TicketQualityRating> {
    const chain = prompt.pipe(this.llm);
    const response = await chain.invoke({...});
    return parser.parse(response);
  }
}
```

**After:**
```typescript
class JiraSubAgent {
  constructor(
    private mode: PeerReviewMode,
    private llm?: BaseLanguageModel  // Optional now!
  ) {
    if (mode === PeerReviewMode.EXECUTE && !llm) {
      throw new Error('LLM required in EXECUTE mode');
    }
  }

  async analyze(context): Promise<JiraSubAgentResult | PromptOnlyResult> {
    if (this.mode === PeerReviewMode.PROMPT_ONLY) {
      return this.buildPrompts(context);
    } else {
      return this.executeAnalysis(context);
    }
  }

  private buildPrompts(context): PromptOnlyResult {
    // Build all 3 prompts without executing
    return {
      mode: 'prompt_only',
      context,
      prompts: [
        this.buildTicketQualityPrompt(context.ticket),
        this.buildACValidationPrompt(context),
        this.buildPeerReviewPrompt(context)
      ],
      instructions: 'Execute these prompts sequentially...'
    };
  }

  private async executeAnalysis(context): Promise<JiraSubAgentResult> {
    // Original logic - execute all prompts with this.llm
    const ticketQuality = await this.rateTicketQuality(context.ticket);
    // ... rest of existing code
  }
}
```

#### 4. Update PeerReviewIntegration

```typescript
class PeerReviewIntegration {
  constructor(
    config: IssueTrackerConfig,
    private mode: PeerReviewMode,
    llm?: BaseLanguageModel
  ) {
    this.subAgent = new JiraSubAgent(mode, llm);
  }

  async analyze(context): Promise<PeerReviewResult> {
    const result = await this.subAgent.analyze(context);

    if (result.mode === 'prompt_only') {
      // MCP mode: return prompts
      return {
        enabled: true,
        mode: 'prompt_only',
        prompts: result.prompts,
        data: result.context
      };
    } else {
      // CLI mode: return analyzed results
      return {
        enabled: true,
        mode: 'execute',
        analysis: result
      };
    }
  }
}
```

#### 5. Update Callers

**CLI (analyze.command.ts):**
```typescript
// No changes needed! Still passes LLM
const integration = createPeerReviewIntegration(config, llm);
const result = await integration.analyze(context);
// result.analysis has the scores/verdicts as before
```

**MCP Server:**
```typescript
// Pass PROMPT_ONLY mode, no LLM
const integration = createPeerReviewIntegration(
  config,
  PeerReviewMode.PROMPT_ONLY
);
const result = await integration.analyze(context);

// Return structured prompts to calling LLM
return {
  content: [{
    type: 'text',
    text: formatPromptsForLLM(result.prompts, result.data)
  }]
};
```

## Migration Steps

1. ✅ Create new branch: `feat/llm-agnostic-peer-review`
2. Define types: `PeerReviewMode`, `AnalysisPrompt`, `PromptOnlyResult`
3. Refactor `JiraSubAgent`:
   - Add mode parameter
   - Split analyze() into buildPrompts() and executeAnalysis()
   - Extract prompt building logic
4. Update `PeerReviewIntegration` to support both modes
5. Update helper function `createPeerReviewIntegration()`
6. Test CLI workflow (should be unchanged)
7. Update MCP server to use PROMPT_ONLY mode
8. Test MCP server returns correct prompts

## Testing Checklist

**CLI (EXECUTE mode):**
- [ ] Ticket quality rating works
- [ ] AC validation works
- [ ] Peer review verdict works
- [ ] Database saves correctly
- [ ] Output format unchanged

**MCP (PROMPT_ONLY mode):**
- [ ] Returns structured prompts
- [ ] Includes all context data
- [ ] No LLM calls attempted
- [ ] Works without API keys

## Rollback Plan
If issues arise, revert the branch. CLI code remains unchanged on main.
