/**
 * Base PR Agent Workflow using LangGraph
 * Follows architecture-doc-generator patterns with self-refinement
 */

import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentContext, AgentResult, FileAnalysis, AgentExecutionOptions } from '../types/agent.types.js';
import {
  parseDiff,
  createFileAnalyzerTool,
  createRiskDetectorTool,
  createComplexityScorerTool,
  createSummaryGeneratorTool,
} from '../tools/pr-analysis-tools.js';

/**
 * Agent workflow state
 */
export const PRAgentState = Annotation.Root({
  // Input context
  context: Annotation<AgentContext>({
    reducer: (_, update) => update,
  }),

  // Current iteration
  iteration: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  // File analyses
  fileAnalyses: Annotation<Map<string, FileAnalysis>>({
    reducer: (_, update) => update,
    default: () => new Map(),
  }),

  // Current analysis state
  currentSummary: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),

  currentRisks: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  currentComplexity: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 1,
  }),

  // Quality metrics
  clarityScore: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  missingInformation: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  // Recommendations
  recommendations: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  // Insights and reasoning
  insights: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  reasoning: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // Token tracking
  totalInputTokens: Annotation<number>({
    reducer: (current, update) => current + update,
    default: () => 0,
  }),

  totalOutputTokens: Annotation<number>({
    reducer: (current, update) => current + update,
    default: () => 0,
  }),
});

/**
 * Configuration for PR agent workflow
 */
export interface PRAgentWorkflowConfig {
  maxIterations: number;
  clarityThreshold: number;
  skipSelfRefinement?: boolean;
}

/**
 * Base class for PR agents with self-refinement workflow
 */
export abstract class BasePRAgentWorkflow {
  protected model: ChatAnthropic;
  protected workflow: ReturnType<typeof this.buildWorkflow>;
  protected checkpointer = new MemorySaver();
  protected tools: any[];

  constructor(apiKey: string, modelName: string = 'claude-sonnet-4-5-20250929') {
    this.model = new ChatAnthropic({
      apiKey,
      modelName,
      temperature: 0.2,
      maxTokens: 4000, // Increased for detailed summaries
    });

    // Initialize tools
    this.tools = [
      createFileAnalyzerTool(),
      createRiskDetectorTool(),
      createComplexityScorerTool(),
      createSummaryGeneratorTool(),
    ];

    this.workflow = this.buildWorkflow();
  }

  /**
   * Build the PR analysis workflow
   */
  private buildWorkflow() {
    const graph = new StateGraph(PRAgentState);

    // Define nodes
    graph.addNode('analyzeFiles', this.analyzeFilesNode.bind(this));
    graph.addNode('detectRisks', this.detectRisksNode.bind(this));
    graph.addNode('calculateComplexity', this.calculateComplexityNode.bind(this));
    graph.addNode('generateSummary', this.generateSummaryNode.bind(this));
    graph.addNode('evaluateQuality', this.evaluateQualityNode.bind(this));
    graph.addNode('refineAnalysis', this.refineAnalysisNode.bind(this));
    graph.addNode('finalize', this.finalizeNode.bind(this));

    // Set entry point
    const entryPoint = 'analyzeFiles' as '__start__';
    graph.setEntryPoint(entryPoint);

    // Build workflow graph
    graph.addEdge(entryPoint, 'detectRisks' as '__start__');
    graph.addEdge('detectRisks' as '__start__', 'calculateComplexity' as '__start__');
    graph.addEdge('calculateComplexity' as '__start__', 'generateSummary' as '__start__');
    graph.addEdge('generateSummary' as '__start__', 'evaluateQuality' as '__start__');

    // Conditional: refine or finalize
    graph.addConditionalEdges('evaluateQuality' as '__start__', this.shouldRefine.bind(this), {
      refine: 'refineAnalysis' as '__start__',
      finalize: 'finalize' as '__start__',
    });

    // After refinement, evaluate again
    graph.addEdge('refineAnalysis' as '__start__', 'evaluateQuality' as '__start__');

    // End after finalization
    graph.addEdge('finalize' as '__start__', END);

    return graph.compile({ checkpointer: this.checkpointer });
  }

  /**
   * Execute the agent workflow
   */
  async execute(context: AgentContext, options?: AgentExecutionOptions): Promise<AgentResult> {
    const startTime = Date.now();

    // Fast path: skip self-refinement
    if (options?.skipSelfRefinement) {
      return this.executeFastPath(context, startTime);
    }

    const config: PRAgentWorkflowConfig = {
      maxIterations: 3,
      clarityThreshold: 80,
      skipSelfRefinement: false,
    };

    const initialState = {
      context,
      iteration: 0,
      fileAnalyses: new Map(),
      currentSummary: '',
      currentRisks: [],
      currentComplexity: 1,
      clarityScore: 0,
      missingInformation: [],
      recommendations: [],
      insights: [],
      reasoning: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };

    const workflowConfig = {
      configurable: {
        thread_id: `pr-agent-${Date.now()}`,
        maxIterations: config.maxIterations,
        clarityThreshold: config.clarityThreshold,
      },
      recursionLimit: 50,
    };

    let finalState = initialState;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Execute workflow - stream returns state updates
    try {
      for await (const state of await this.workflow.stream(initialState, workflowConfig as any)) {
        // Get the last node's state
        const nodeNames = Object.keys(state);
        if (nodeNames.length > 0) {
          const lastNodeName = nodeNames[nodeNames.length - 1];
          finalState = (state as any)[lastNodeName] || finalState;

          // Extract token counts if present
          const stateAny = finalState as any;
          if (stateAny.totalInputTokens !== undefined) {
            totalInputTokens = stateAny.totalInputTokens;
          }
          if (stateAny.totalOutputTokens !== undefined) {
            totalOutputTokens = stateAny.totalOutputTokens;
          }
        }
      }
    } catch (error) {
      console.error('Workflow execution error:', error);
      throw error;
    }

    const executionTime = Date.now() - startTime;

    return {
      summary: finalState.currentSummary,
      fileAnalyses: finalState.fileAnalyses,
      overallComplexity: finalState.currentComplexity,
      overallRisks: finalState.currentRisks,
      recommendations: finalState.recommendations,
      insights: finalState.insights,
      reasoning: finalState.reasoning,
      provider: 'anthropic',
      model: this.model.modelName,
      totalTokensUsed: totalInputTokens + totalOutputTokens,
      executionTime,
      mode: context.mode,
    };
  }

  /**
   * Fast path execution - skip refinement
   */
  private async executeFastPath(context: AgentContext, startTime: number): Promise<AgentResult> {
    const files = parseDiff(context.diff);
    const fileAnalyses = new Map<string, FileAnalysis>();

    // Analyze each file
    for (const file of files.slice(0, 20)) { // Limit to 20 files
      const analysis: FileAnalysis = {
        path: file.path,
        summary: `Modified ${file.additions} lines, deleted ${file.deletions} lines`,
        risks: [],
        complexity: Math.min(5, Math.floor((file.additions + file.deletions) / 50) + 1),
        changes: {
          additions: file.additions,
          deletions: file.deletions,
        },
        recommendations: [],
      };

      fileAnalyses.set(file.path, analysis);
    }

    // Calculate overall complexity
    const complexities = Array.from(fileAnalyses.values()).map(f => f.complexity);
    const overallComplexity = complexities.length > 0
      ? Math.round(complexities.reduce((a, b) => a + b, 0) / complexities.length)
      : 1;

    const executionTime = Date.now() - startTime;

    return {
      summary: `Analyzed ${files.length} files with ${files.reduce((sum, f) => sum + f.additions, 0)} additions and ${files.reduce((sum, f) => sum + f.deletions, 0)} deletions`,
      fileAnalyses,
      overallComplexity,
      overallRisks: [],
      recommendations: ['Fast path analysis - run with --agent for detailed analysis'],
      insights: [],
      reasoning: ['Fast path: Self-refinement skipped for speed'],
      provider: 'anthropic',
      model: this.model.modelName,
      totalTokensUsed: 0,
      executionTime,
      mode: context.mode,
    };
  }

  // Workflow nodes

  private async analyzeFilesNode(state: typeof PRAgentState.State) {
    const { context } = state;
    const files = parseDiff(context.diff);
    
    console.log(`🔍 Analyzing ${files.length} files...`);

    const fileAnalyses = new Map<string, FileAnalysis>();

    // Analyze files in batches for detailed insights
    const filesToAnalyze = files.slice(0, 15); // Limit to 15 files for detailed analysis
    const importantFiles = filesToAnalyze.filter(f => 
      f.additions + f.deletions > 20 || // Significant changes
      f.path.includes('config') || 
      f.path.includes('schema') ||
      f.path.includes('migration') ||
      f.path.includes('test')
    ).slice(0, 5); // Top 5 important files

    // Get detailed analysis for important files
    if (importantFiles.length > 0) {
      try {
        const fileDetailsPrompt = `Analyze these important files from a pull request. For each file, provide a brief but insightful description of what changed and why it matters.

Files:
${importantFiles.map(f => `
File: ${f.path}
Status: ${f.status || 'modified'}
Changes: +${f.additions} -${f.deletions}
Diff preview:
\`\`\`
${f.diff.substring(0, 500)}
\`\`\`
`).join('\n---\n')}

Respond with a JSON object mapping file paths to analysis objects:
{
  "path/to/file": {
    "summary": "Brief description of changes",
    "risks": ["risk1", "risk2"],
    "complexity": 1-5,
    "recommendations": ["rec1", "rec2"]
  }
}`;

        const response = await this.model.invoke(fileDetailsPrompt);
        const content = response.content as string;
        
        // Track tokens
        const usage = (response.response_metadata as any)?.usage;
        const inputTokens = usage?.input_tokens || 0;
        const outputTokens = usage?.output_tokens || 0;

        // Parse detailed file analyses
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const detailedAnalyses = JSON.parse(jsonMatch[0]);
            
            // Apply detailed analysis to file analyses
            for (const file of importantFiles) {
              const detail = detailedAnalyses[file.path];
              if (detail) {
                fileAnalyses.set(file.path, {
                  path: file.path,
                  summary: detail.summary || `${file.status || 'M'}: +${file.additions} -${file.deletions}`,
                  risks: Array.isArray(detail.risks) ? detail.risks : [],
                  complexity: detail.complexity || Math.min(5, Math.floor((file.additions + file.deletions) / 50) + 1),
                  changes: {
                    additions: file.additions,
                    deletions: file.deletions,
                  },
                  recommendations: Array.isArray(detail.recommendations) ? detail.recommendations : [],
                });
              }
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse file analysis JSON, using basic analysis');
        }

        // Update state with token tracking
        state = {
          ...state,
          totalInputTokens: (state.totalInputTokens || 0) + inputTokens,
          totalOutputTokens: (state.totalOutputTokens || 0) + outputTokens,
        };
      } catch (error) {
        console.warn('Error in detailed file analysis, falling back to basic:', error);
      }
    }

    // Add basic analysis for remaining files
    for (const file of filesToAnalyze) {
      if (!fileAnalyses.has(file.path)) {
        const analysis: FileAnalysis = {
          path: file.path,
          summary: `${file.status || 'M'}: +${file.additions} -${file.deletions}`,
          risks: [],
          complexity: Math.min(5, Math.floor((file.additions + file.deletions) / 50) + 1),
          changes: {
            additions: file.additions,
            deletions: file.deletions,
          },
          recommendations: [],
        };

        fileAnalyses.set(file.path, analysis);
      }
    }

    return {
      ...state,
      fileAnalyses,
      insights: [`Analyzed ${files.length} files (${importantFiles.length} in detail)`],
    };
  }

  private async detectRisksNode(state: typeof PRAgentState.State) {
    const { context, fileAnalyses } = state;
    
    console.log('⚠️  Detecting risks...');

    // Build context for risk analysis
    const fileList = Array.from(fileAnalyses.entries())
      .slice(0, 15)
      .map(([path, analysis]) => 
        `${path} (+${analysis.changes.additions} -${analysis.changes.deletions})`
      )
      .join('\n');

    // Get a sample of the diff for risk analysis (limit size)
    const diffSample = context.diff.substring(0, 8000); // First 8KB for context

    const riskPrompt = `You are a security and code quality expert analyzing a pull request for potential risks.

Analyze the following changes and identify SPECIFIC risks in these categories:
1. **Security Risks**: Exposed credentials, insecure patterns, authentication/authorization issues
2. **Breaking Changes**: API changes, database schema changes, removed functionality
3. **Performance Concerns**: Inefficient algorithms, memory leaks, N+1 queries
4. **Code Quality**: Complex logic, missing error handling, lack of tests
5. **Operational Risks**: Configuration changes, deployment concerns, dependency updates

PR Title: ${context.title || 'No title provided'}

Files changed:
${fileList}

Diff sample:
\`\`\`
${diffSample}
\`\`\`

Provide a JSON array of specific risks found. Each risk should be a clear, actionable statement.
Format: ["risk 1", "risk 2", ...]

Only include risks that are actually present. If no significant risks, return an empty array [].`;

    try {
      const response = await this.model.invoke(riskPrompt);
      const content = response.content as string;
      
      // Track tokens
      const usage = (response.response_metadata as any)?.usage;
      const inputTokens = usage?.input_tokens || 0;
      const outputTokens = usage?.output_tokens || 0;

      // Parse JSON response
      let risks: string[] = [];
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          risks = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.warn('Failed to parse risk JSON, extracting manually');
        // Fallback: extract bullet points
        const lines = content.split('\n');
        risks = lines
          .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
          .map(line => line.replace(/^[-•]\s*/, '').trim())
          .filter(line => line.length > 0);
      }

      // Add basic pattern-based checks
      const patternRisks: string[] = [];
      if (context.diff.includes('password') || context.diff.includes('secret') || context.diff.includes('api_key')) {
        patternRisks.push('Potential credentials or sensitive data in code changes');
      }
      if (fileAnalyses.size > 20) {
        patternRisks.push(`Large change set (${fileAnalyses.size} files) - may be difficult to review thoroughly`);
      }
      if (context.diff.includes('DROP TABLE') || context.diff.includes('ALTER TABLE')) {
        patternRisks.push('Database schema changes detected - requires careful migration planning');
      }

      // Merge risks, avoiding duplicates
      const allRisks = [...new Set([...risks, ...patternRisks])];

      return {
        ...state,
        currentRisks: allRisks,
        insights: [`Identified ${allRisks.length} potential risks`],
        totalInputTokens: (state.totalInputTokens || 0) + inputTokens,
        totalOutputTokens: (state.totalOutputTokens || 0) + outputTokens,
      };
    } catch (error) {
      console.error('Error in risk detection:', error);
      
      // Fallback to basic pattern matching
      const basicRisks: string[] = [];
      if (context.diff.includes('password') || context.diff.includes('secret')) {
        basicRisks.push('Potential credentials in diff');
      }
      if (fileAnalyses.size > 15) {
        basicRisks.push('Large change set - difficult to review');
      }

      return {
        ...state,
        currentRisks: basicRisks,
        insights: [`Identified ${basicRisks.length} potential risks (basic analysis)`],
      };
    }
  }

  private async calculateComplexityNode(state: typeof PRAgentState.State) {
    const { fileAnalyses } = state;
    
    console.log('📊 Calculating complexity...');

    const complexities = Array.from(fileAnalyses.values()).map(f => f.complexity);
    const avgComplexity = complexities.length > 0
      ? complexities.reduce((a, b) => a + b, 0) / complexities.length
      : 1;

    return {
      ...state,
      currentComplexity: Math.round(avgComplexity),
    };
  }

  private async generateSummaryNode(state: typeof PRAgentState.State) {
    const { context, fileAnalyses, currentRisks, currentComplexity } = state;
    
    console.log('📝 Generating detailed summary...');

    const totalFiles = fileAnalyses.size;
    const totalAdditions = Array.from(fileAnalyses.values()).reduce((sum, f) => sum + f.changes.additions, 0);
    const totalDeletions = Array.from(fileAnalyses.values()).reduce((sum, f) => sum + f.changes.deletions, 0);

    // Build file list with changes
    const fileList = Array.from(fileAnalyses.entries())
      .slice(0, 20)
      .map(([path, analysis]) => 
        `- ${path}: +${analysis.changes.additions} -${analysis.changes.deletions} (complexity: ${analysis.complexity}/5)`
      )
      .join('\n');

    // Create comprehensive prompt for LLM
    const summaryPrompt = `You are analyzing a pull request. Provide a DETAILED and COMPREHENSIVE summary that covers:

1. **Overall Purpose**: What is this PR trying to accomplish? What problem does it solve?
2. **Key Changes**: What are the main changes being made? Group related changes together.
3. **Impact Analysis**: What parts of the system are affected? What are the implications?
4. **Technical Details**: Mention important technical aspects (new dependencies, API changes, data model changes, etc.)
5. **Patterns Observed**: Any design patterns, refactoring, or architectural changes?

PR Title: ${context.title || 'No title provided'}

Statistics:
- Files changed: ${totalFiles}
- Lines added: ${totalAdditions}
- Lines deleted: ${totalDeletions}
- Overall complexity: ${currentComplexity}/5
- Risks identified: ${currentRisks.length}

Files changed:
${fileList}

${currentRisks.length > 0 ? `\nRisks detected:\n${currentRisks.map(r => `- ${r}`).join('\n')}` : ''}

Provide a detailed, well-structured summary (3-5 paragraphs) that would help a reviewer understand the scope and purpose of this PR.`;

    try {
      const response = await this.model.invoke(summaryPrompt);
      const detailedSummary = response.content as string;

      // Track token usage
      const usage = (response.response_metadata as any)?.usage;
      const inputTokens = usage?.input_tokens || 0;
      const outputTokens = usage?.output_tokens || 0;

      return {
        ...state,
        currentSummary: detailedSummary,
        totalInputTokens: inputTokens,
        totalOutputTokens: outputTokens,
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      // Fallback to basic summary
      const fallbackSummary = `PR Analysis Summary:
- Files changed: ${totalFiles}
- Additions: ${totalAdditions}
- Deletions: ${totalDeletions}
- Overall complexity: ${currentComplexity}/5
- Risks identified: ${currentRisks.length}

${context.title ? `Title: ${context.title}` : ''}`;

      return {
        ...state,
        currentSummary: fallbackSummary,
      };
    }
  }

  private async evaluateQualityNode(state: typeof PRAgentState.State) {
    const { iteration } = state;
    
    console.log(`🔍 Evaluating quality (iteration ${iteration + 1})...`);

    // Simple quality check
    const clarityScore = 85; // Placeholder

    return {
      ...state,
      clarityScore,
      iteration: iteration + 1,
    };
  }

  private async refineAnalysisNode(state: typeof PRAgentState.State) {
    const { currentSummary, currentRisks, fileAnalyses, context } = state;
    
    console.log('🔄 Refining analysis...');

    // Generate comprehensive recommendations
    const refinementPrompt = `Based on this PR analysis, provide specific, actionable recommendations for the developer and reviewers.

PR Summary:
${currentSummary}

Risks Identified:
${currentRisks.map(r => `- ${r}`).join('\n')}

Files Changed: ${fileAnalyses.size}

Consider:
1. Code organization and structure improvements
2. Testing recommendations
3. Documentation needs
4. Performance optimizations
5. Security enhancements
6. Review process suggestions

Provide a JSON array of 3-5 specific, actionable recommendations:
["recommendation 1", "recommendation 2", ...]`;

    try {
      const response = await this.model.invoke(refinementPrompt);
      const content = response.content as string;
      
      // Track tokens
      const usage = (response.response_metadata as any)?.usage;
      const inputTokens = usage?.input_tokens || 0;
      const outputTokens = usage?.output_tokens || 0;

      // Parse recommendations
      let recommendations: string[] = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          recommendations = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        // Fallback: extract bullet points
        const lines = content.split('\n');
        recommendations = lines
          .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•') || /^\d+\./.test(line.trim()))
          .map(line => line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
          .filter(line => line.length > 0)
          .slice(0, 5);
      }

      // Add default recommendations if none found
      if (recommendations.length === 0) {
        recommendations = [
          'Ensure comprehensive test coverage for new functionality',
          'Update relevant documentation',
          'Consider performance implications of changes',
        ];
      }

      return {
        ...state,
        recommendations,
        totalInputTokens: (state.totalInputTokens || 0) + inputTokens,
        totalOutputTokens: (state.totalOutputTokens || 0) + outputTokens,
      };
    } catch (error) {
      console.error('Error refining analysis:', error);
      return {
        ...state,
        recommendations: [
          'Review changes carefully for potential side effects',
          'Ensure test coverage is adequate',
          'Update documentation as needed',
        ],
      };
    }
  }

  private async finalizeNode(state: typeof PRAgentState.State) {
    console.log('✨ Finalizing analysis...');
    
    return state;
  }

  private shouldRefine(state: typeof PRAgentState.State): string {
    // Use defaults if config not accessible
    const maxIterations = 3;
    const clarityThreshold = 80;

    if (state.iteration >= maxIterations) {
      console.log(`⏹️  Stopping: Max iterations (${maxIterations}) reached`);
      return 'finalize';
    }

    if (state.clarityScore >= clarityThreshold) {
      console.log(`✅ Stopping: Clarity threshold (${clarityThreshold}) achieved`);
      return 'finalize';
    }

    console.log(`🔄 Continuing: Iteration ${state.iteration}, clarity ${state.clarityScore}`);
    return 'refine';
  }
}

