/**
 * Base PR Agent Workflow using LangGraph
 * Follows architecture-doc-generator patterns with self-refinement
 */

import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AgentContext, AgentResult, FileAnalysis, AgentExecutionOptions } from '../types/agent.types.js';
import {
  parseDiff,
  createFileAnalyzerTool,
  createRiskDetectorTool,
  createComplexityScorerTool,
  createSummaryGeneratorTool,
} from '../tools/pr-analysis-tools.js';
import { formatArchDocsForPrompt, getSecurityContext, getPatternsContext } from '../utils/arch-docs-rag.js';
import { parseAllArchDocs } from '../utils/arch-docs-parser.js';
import { runSemgrepAnalysis, summarizeSemgrepFindings, filterFindingsByChangedFiles } from '../utils/semgrep-runner.js';
import { SemgrepResult, SemgrepSummary, SemgrepFinding } from '../types/semgrep.types.js';

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

  fixes: Annotation<Array<{
    file: string;
    line?: number;
    comment: string;
    severity?: 'critical' | 'warning' | 'suggestion';
  }>>({
    reducer: (_, update) => update,
    default: () => [],
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

  // Arch-docs tracking
  archDocsInfluencedStages: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  archDocsKeyInsights: Annotation<string[]>({
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

  // Semgrep static analysis
  semgrepResult: Annotation<SemgrepResult | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  semgrepSummary: Annotation<SemgrepSummary | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
});

/**
 * Configuration for PR agent workflow
 */
export interface PRAgentWorkflowConfig {
  skipSelfRefinement?: boolean;
}

/**
 * Base class for PR agents with self-refinement workflow
 */
export abstract class BasePRAgentWorkflow {
  protected model: BaseChatModel;
  protected workflow: ReturnType<typeof this.buildWorkflow>;
  protected checkpointer = new MemorySaver();
  protected tools: any[];

  constructor(model: BaseChatModel) {
    this.model = model;

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

    // Define nodes - simplified workflow
    graph.addNode('analyzeFiles', this.analyzeFilesNode.bind(this));
    graph.addNode('runStaticAnalysis', this.runStaticAnalysisNode.bind(this));
    graph.addNode('generateFixes', this.generateFixesNode.bind(this));
    graph.addNode('generateSummary', this.generateSummaryNode.bind(this));
    graph.addNode('finalize', this.finalizeNode.bind(this));

    // Set entry point
    const entryPoint = 'analyzeFiles' as '__start__';
    graph.setEntryPoint(entryPoint);

    // Build simplified linear workflow graph
    graph.addEdge(entryPoint, 'runStaticAnalysis' as '__start__');
    graph.addEdge('runStaticAnalysis' as '__start__', 'generateFixes' as '__start__');
    graph.addEdge('generateFixes' as '__start__', 'generateSummary' as '__start__');
    graph.addEdge('generateSummary' as '__start__', 'finalize' as '__start__');
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

    const initialState = {
      context,
      iteration: 0,
      fileAnalyses: new Map(),
      currentSummary: '',
      fixes: [],
      clarityScore: 0,
      missingInformation: [],
      recommendations: [],
      insights: [],
      reasoning: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      semgrepResult: null,
      semgrepSummary: null,
      archDocsInfluencedStages: [],
      archDocsKeyInsights: [],
    };

    const workflowConfig = {
      configurable: {
        thread_id: `pr-agent-${Date.now()}`,
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

    // Build arch-docs impact summary with deduplication
    const stateAny = finalState as any;
    const archDocsImpact = context.archDocs?.available ? {
      used: true,
      docsAvailable: context.archDocs.totalDocs,
      sectionsUsed: context.archDocs.relevantDocs.length,
      influencedStages: [...new Set<string>(stateAny.archDocsInfluencedStages || [])],
      keyInsights: [...new Set<string>(stateAny.archDocsKeyInsights || [])],
    } : undefined;

    // Build static analysis summary
    const staticAnalysis = stateAny.semgrepSummary ? {
      enabled: true,
      totalFindings: stateAny.semgrepSummary.totalFindings,
      errorCount: stateAny.semgrepSummary.errorCount,
      warningCount: stateAny.semgrepSummary.warningCount,
      criticalIssues: stateAny.semgrepSummary.criticalFindings.map((f: SemgrepFinding) => f.extra.message).slice(0, 5),
    } : undefined;

    return {
      summary: finalState.currentSummary,
      fileAnalyses: finalState.fileAnalyses,
      fixes: finalState.fixes,
      recommendations: finalState.recommendations,
      insights: finalState.insights,
      reasoning: finalState.reasoning,
      provider: 'ai',
      model: (this.model as any).modelName || 'unknown',
      totalTokensUsed: totalInputTokens + totalOutputTokens,
      executionTime,
      mode: context.mode,
      archDocsImpact,
      staticAnalysis,
    };
  }

  /**
   * Fast path execution - skip refinement loop but still use LLM for detailed analysis
   */
  private async executeFastPath(context: AgentContext, startTime: number): Promise<AgentResult> {
    // Initialize state
    const initialState = {
      context,
      iteration: 0,
      fileAnalyses: new Map<string, FileAnalysis>(),
      currentSummary: '',
      fixes: [],
      clarityScore: 0,
      missingInformation: [] as string[],
      recommendations: [] as string[],
      insights: [] as string[],
      reasoning: [] as string[],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      semgrepResult: null,
      semgrepSummary: null,
    };

    // Execute workflow nodes sequentially (skip refinement loop)
    let state: any = initialState;

    try {
      // 1. Analyze files
      state = await this.analyzeFilesNode(state);
      
      // 2. Run static analysis
      state = await this.runStaticAnalysisNode(state);
      
      // 3. Generate fixes
      state = await this.generateFixesNode(state);
      
      // 4. Generate summary
      state = await this.generateSummaryNode(state);
      
      // 5. Finalize (includes recommendations)
      state = await this.finalizeNode(state);

      const executionTime = Date.now() - startTime;

      // Build arch-docs impact summary with deduplication
      const stateAny = state as any;
      const archDocsImpact = context.archDocs?.available ? {
        used: true,
        docsAvailable: context.archDocs.totalDocs,
        sectionsUsed: context.archDocs.relevantDocs.length,
        influencedStages: [...new Set<string>(stateAny.archDocsInfluencedStages || [])],
        keyInsights: [...new Set<string>(stateAny.archDocsKeyInsights || [])],
      } : undefined;

      // Build static analysis summary
      const staticAnalysis = state.semgrepSummary ? {
        enabled: true,
        totalFindings: state.semgrepSummary.totalFindings,
        errorCount: state.semgrepSummary.errorCount,
        warningCount: state.semgrepSummary.warningCount,
        criticalIssues: state.semgrepSummary.criticalFindings.map((f: SemgrepFinding) => f.extra.message).slice(0, 5),
      } : undefined;

      return {
        summary: state.currentSummary,
        fileAnalyses: state.fileAnalyses,
        fixes: state.fixes,
        recommendations: state.recommendations,
        insights: state.insights,
        reasoning: [...state.reasoning, 'Fast path: Self-refinement evaluation skipped for speed'],
        provider: 'ai',
        model: (this.model as any).modelName || 'unknown',
        totalTokensUsed: state.totalInputTokens + state.totalOutputTokens,
        executionTime,
        mode: context.mode,
        archDocsImpact,
        staticAnalysis,
      };
    } catch (error) {
      console.error('Fast path execution error:', error);
      throw error;
    }
  }

  // Workflow nodes

  private async analyzeFilesNode(state: typeof PRAgentState.State) {
    const { context } = state;
    const files = parseDiff(context.diff);
    
    console.log(`🔍 Analyzing ${files.length} files...`);
    
    // Show arch-docs status if available
    if (context.archDocs?.available) {
      console.log(`📚 Using architecture documentation (${context.archDocs.totalDocs} docs, ${context.archDocs.relevantDocs.length} relevant sections)`);
    }

    const fileAnalyses = new Map<string, FileAnalysis>();

    // Build arch-docs context if available
    let archDocsContext = '';
    if (context.archDocs?.available) {
      archDocsContext = formatArchDocsForPrompt(context.archDocs);
    }

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

        const fileDetailsPrompt = `Analyze these files from a pull request. For EACH file, provide a detailed analysis considering the repository's architecture standards.
${archDocsContext ? '\n' + archDocsContext : ''}

Files to analyze:
${importantFiles.map(f => `
File: ${f.path}
Status: ${f.status || 'modified'}
Changes: +${f.additions} -${f.deletions}
Diff preview:
\`\`\`
${f.diff.substring(0, 500)}
\`\`\`
`).join('\n---\n')}

${archDocsContext ? `CRITICAL INSTRUCTIONS:
- For EACH file, reference the relevant architecture documentation sections above
- Explain how the changes align with or diverge from established patterns
- Identify specific guidelines that apply to each file
- Mention which parts of the architecture are affected
- Compare changes against documented standards

` : ''}

Respond with a JSON object mapping file paths to analysis objects:
{
  "path/to/file": {
    "summary": "Description that references relevant arch-docs patterns/guidelines",
    "risks": ["risk with arch-docs context", "risk2"],
    "complexity": 1-5,
    "recommendations": ["recommendation based on arch-docs standards"]
  }
}

${archDocsContext ? 'Each summary MUST reference the specific architecture documentation that applies to this file.' : ''}`;

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

    // Track arch-docs usage
    const newInsights = [`Analyzed ${files.length} files (${importantFiles.length} in detail)`];
    const hasArchDocsContext = archDocsContext && archDocsContext.length > 0;
    const archDocsStages = hasArchDocsContext ? ['file-analysis'] : [];
    const archDocsInsights = [];
    
    if (hasArchDocsContext && context.archDocs?.available) {
      archDocsInsights.push(`Applied ${context.archDocs.relevantDocs.length} architecture documentation sections to analyze files in context of repository standards`);
    }

    return {
      ...state,
      fileAnalyses,
      insights: newInsights,
      archDocsInfluencedStages: archDocsStages,
      archDocsKeyInsights: archDocsInsights,
    };
  }

  private async runStaticAnalysisNode(state: typeof PRAgentState.State) {
    const { context } = state;

    // Skip if static analysis is disabled
    if (!context.enableStaticAnalysis) {
      console.log('⏭️  Static analysis disabled, skipping...');
      return state;
    }


    try {
      // Get current working directory for analysis
      const targetPath = process.cwd();

      // Run Semgrep analysis
      const semgrepResult = await runSemgrepAnalysis(
        targetPath,
        {
          enabled: true,
          timeout: 30,
          maxFileSize: 1000000, // 1MB
          excludePaths: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/.git/**',
            '**/*.min.js',
            '**/*.map',
          ],
        },
        context.language,
        context.framework,
      );

      // Check for errors
      if (semgrepResult.errors && semgrepResult.errors.length > 0) {
        const hasBlockingError = semgrepResult.errors.some(e => e.level === 'error' && e.type === 'semgrep_not_installed');
        if (hasBlockingError) {
          console.log('ℹ️  Semgrep not available, continuing without static analysis');
          return state;
        }
      }

      // Filter findings to only include changed files
      const changedFilePaths = context.files.map(f => f.path);
      const relevantFindings = filterFindingsByChangedFiles(semgrepResult.results || [], changedFilePaths);

      // Create filtered result
      const filteredResult: SemgrepResult = {
        ...semgrepResult,
        results: relevantFindings,
      };

      // Summarize findings
      const summary = summarizeSemgrepFindings(filteredResult);

      console.log(`   Found ${summary.totalFindings} issues (${summary.errorCount} errors, ${summary.warningCount} warnings)`);

      return {
        ...state,
        semgrepResult: filteredResult,
        semgrepSummary: summary,
        insights: [`Static analysis: ${summary.totalFindings} findings in changed files`],
      };
    } catch (error) {
      console.error('Error running static analysis:', error);
      return {
        ...state,
        insights: ['Static analysis encountered an error and was skipped'],
      };
    }
  }

  private async generateFixesNode(state: typeof PRAgentState.State) {
    const { context, fileAnalyses, semgrepSummary, semgrepResult } = state;
    
    console.log('🔧 Generating fixes...');

    // If static analysis is enabled, convert Semgrep findings to fixes
    if (context.enableStaticAnalysis && semgrepResult && semgrepSummary && semgrepSummary.totalFindings > 0) {
      console.log('   Converting Semgrep findings to fixes');
      const fixes = semgrepResult.results.map((finding: SemgrepFinding) => ({
        file: finding.path,
        line: finding.start.line,
        comment: `${finding.extra.severity === 'ERROR' ? '🔴 **Critical**: ' : finding.extra.severity === 'WARNING' ? '🟡 **Warning**: ' : 'ℹ️ '}${finding.extra.message}\n\n**Rule**: ${finding.check_id}${finding.extra.metadata?.cwe ? `\n**CWE**: ${finding.extra.metadata.cwe.join(', ')}` : ''}${finding.extra.metadata?.owasp ? `\n**OWASP**: ${finding.extra.metadata.owasp.join(', ')}` : ''}`,
        severity: finding.extra.severity === 'ERROR' ? 'critical' as const : finding.extra.severity === 'WARNING' ? 'warning' as const : 'suggestion' as const,
        source: 'semgrep' as const,
      }));

      return {
        ...state,
        fixes,
        insights: [`Generated ${fixes.length} fixes from Semgrep findings`],
      };
    }

    // Otherwise, do AI-based fix generation
    console.log('   Running AI-based fix generation');
    
    // Parse diff to get file paths and line numbers
    const files = parseDiff(context.diff);
    const fileList = Array.from(fileAnalyses.entries())
      .slice(0, 15)
      .map(([path, analysis]) => 
        `${path} (+${analysis.changes.additions} -${analysis.changes.deletions})`
      )
      .join('\n');

    // Get diff sample with line numbers
    const diffSample = context.diff.substring(0, 12000);

    // Add security context from arch-docs if available
    let securityContext = '';
    let allDocs: any[] = [];
    
    if (context.archDocs?.available) {
      allDocs = parseAllArchDocs();
      const secDoc = getSecurityContext(allDocs);
      if (secDoc) {
        securityContext = `\n## Security Guidelines from Repository Documentation\n\n${secDoc.substring(0, 3000)}\n`;
      }
      
      const patterns = getPatternsContext(allDocs);
      if (patterns) {
        securityContext += `\n## Repository Patterns and Best Practices\n\n${patterns.substring(0, 2000)}\n`;
      }
    }

    const fixesPrompt = `You are a code reviewer analyzing a pull request. Generate CRUCIAL, actionable fixes as PR comments.
${securityContext}

Analyze the following changes and identify issues that NEED to be fixed. Focus on:
1. **Security Issues**: Exposed credentials, insecure patterns, authentication/authorization problems
2. **Critical Bugs**: Logic errors, null pointer risks, race conditions
3. **Breaking Changes**: API changes without versioning, removed functionality
4. **Code Quality**: Missing error handling, code smells, anti-patterns
5. **Performance**: Inefficient algorithms, memory leaks, N+1 queries

PR Title: ${context.title || 'No title provided'}

Files changed:
${fileList}

Diff:
\`\`\`
${diffSample}
\`\`\`

${securityContext ? `IMPORTANT: Reference repository documentation when applicable.` : ''}

For EACH issue found, provide:
- **file**: The file path where the issue exists
- **line**: Approximate line number (if you can identify it from the diff, otherwise omit)
- **comment**: Actionable PR comment explaining the issue and how to fix it. Be specific and helpful.
- **severity**: "critical" (must fix), "warning" (should fix), or "suggestion" (nice to have)

Return a JSON array of fix objects:
[
  {
    "file": "src/path/to/file.ts",
    "line": 42,
    "comment": "**Security Issue**: Hardcoded API key detected. Use environment variables instead.\n\n**Fix**: Move to process.env.API_KEY or use a secrets manager.",
    "severity": "critical"
  },
  {
    "file": "src/utils/helper.ts",
    "comment": "**Missing Error Handling**: This function can throw but errors aren't caught.\n\n**Fix**: Wrap in try-catch or add error handling.",
    "severity": "warning"
  }
]

Only include CRUCIAL fixes that matter. If no significant issues, return an empty array [].`;

    try {
      const response = await this.model.invoke(fixesPrompt);
      const content = response.content as string;
      
      // Track tokens
      const usage = (response.response_metadata as any)?.usage;
      const inputTokens = usage?.input_tokens || 0;
      const outputTokens = usage?.output_tokens || 0;

      // Parse JSON response
      let fixes: Array<{file: string; line?: number; comment: string; severity?: 'critical' | 'warning' | 'suggestion'; source?: 'semgrep' | 'ai'}> = [];
      
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsedFixes = JSON.parse(jsonMatch[0]);
          fixes = parsedFixes
            .filter((f: any) => f.file && f.comment)
            .map((f: any) => ({
              file: f.file,
              line: f.line,
              comment: f.comment,
              severity: f.severity || 'warning',
              source: 'ai' as const,
            }))
            // Prioritize critical and warning fixes, limit suggestions
            .sort((a: any, b: any) => {
              const severityOrder: Record<string, number> = { critical: 0, warning: 1, suggestion: 2 };
              const aSeverity = a.severity || 'warning';
              const bSeverity = b.severity || 'warning';
              return (severityOrder[aSeverity] ?? 2) - (severityOrder[bSeverity] ?? 2);
            })
            // Limit to top 10 fixes (prioritize critical/warning)
            .slice(0, 10);
        }
      } catch (parseError) {
        console.warn('Failed to parse fixes JSON:', parseError);
      }

      // Add pattern-based fixes for critical issues
      if (context.diff.includes('password') || context.diff.includes('secret') || context.diff.includes('api_key')) {
        const fileMatch = context.diff.match(/^diff --git a\/.*? b\/(.+)$/m);
        const affectedFile = fileMatch ? fileMatch[1] : 'unknown';
        fixes.push({
          file: affectedFile,
          comment: '**Security Issue**: Potential hardcoded credentials detected. Use environment variables or a secrets manager instead of hardcoding sensitive values.',
          severity: 'critical',
          source: 'ai' as const,
        });
      }

      // Track arch-docs usage
      const archDocsStages = securityContext ? ['fix-generation'] : [];
      const archDocsInsights = [];
      
      if (securityContext && context.archDocs?.available && fixes.length > 0) {
        archDocsInsights.push(`Generated ${fixes.length} fixes based on repository guidelines`);
      }

      return {
        ...state,
        fixes,
        insights: [`Generated ${fixes.length} crucial fixes`],
        totalInputTokens: (state.totalInputTokens || 0) + inputTokens,
        totalOutputTokens: (state.totalOutputTokens || 0) + outputTokens,
        archDocsInfluencedStages: archDocsStages,
        archDocsKeyInsights: archDocsInsights,
      };
    } catch (error) {
      console.error('Error generating fixes:', error);
      
      return {
        ...state,
        fixes: [],
        insights: ['Fix generation encountered an error'],
      };
    }
  }

  private async generateSummaryNode(state: typeof PRAgentState.State) {
    const { context, fileAnalyses, fixes, semgrepSummary } = state;
    
    console.log('📝 Generating detailed summary...');

    const totalFiles = fileAnalyses.size;
    const totalAdditions = Array.from(fileAnalyses.values()).reduce((sum, f) => sum + f.changes.additions, 0);
    const totalDeletions = Array.from(fileAnalyses.values()).reduce((sum, f) => sum + f.changes.deletions, 0);

    // Build file list with changes
    const fileList = Array.from(fileAnalyses.entries())
      .slice(0, 20)
      .map(([path, analysis]) => 
        `- ${path}: +${analysis.changes.additions} -${analysis.changes.deletions}`
      )
      .join('\n');

    // Add patterns context from arch-docs if available
    let patternsContext = '';
    if (context.archDocs?.available) {
      const allDocs = parseAllArchDocs();
      const patterns = getPatternsContext(allDocs);
      if (patterns) {
        patternsContext = `\n## Design Patterns from Repository Documentation\n\n${patterns.substring(0, 2000)}\n`;
      }
    }

    // Add Semgrep summary if available
    let semgrepSummaryContext = '';
    if (semgrepSummary && semgrepSummary.totalFindings > 0) {
      semgrepSummaryContext = `\n## Static Analysis Summary (Semgrep)\n\n`;
      semgrepSummaryContext += `- Total findings: ${semgrepSummary.totalFindings}\n`;
      semgrepSummaryContext += `- Errors: ${semgrepSummary.errorCount}\n`;
      semgrepSummaryContext += `- Warnings: ${semgrepSummary.warningCount}\n`;
      semgrepSummaryContext += `- Categories affected: ${semgrepSummary.categoriesAffected.join(', ')}\n`;
      semgrepSummaryContext += `- Files with issues: ${semgrepSummary.filesWithIssues.length}\n\n`;
    }

    // Create concise prompt for quick reading
    const summaryPrompt = `Analyze this pull request and provide a BRIEF, scannable summary (2-3 sentences max).

Focus on:
- **What**: What does this PR do? (one sentence)
- **Why**: What problem does it solve or what feature does it add? (one sentence)
- **Impact**: What parts of the codebase are affected? (one sentence if significant)

PR Title: ${context.title || 'No title provided'}
${context.language ? `Language: ${context.language}${context.framework ? ` (${context.framework})` : ''}` : ''}

Stats: ${totalFiles} files, +${totalAdditions}/-${totalDeletions} lines${fixes.length > 0 ? `, ${fixes.filter((f: any) => f.severity === 'critical').length} critical fixes` : ''}

Key files:
${fileList.split('\n').slice(0, 5).join('\n')}

${semgrepSummaryContext && semgrepSummary ? `Static analysis found ${semgrepSummary.totalFindings} issues (${semgrepSummary.errorCount} critical). ` : ''}

Write a concise summary that helps reviewers quickly understand the PR's purpose and scope. Be direct and specific.`;

    try {
      const response = await this.model.invoke(summaryPrompt);
      const detailedSummary = response.content as string;

      // Track token usage
      const usage = (response.response_metadata as any)?.usage;
      const inputTokens = usage?.input_tokens || 0;
      const outputTokens = usage?.output_tokens || 0;

      // Track arch-docs usage in summary
      const archDocsStages = patternsContext ? ['summary-generation'] : [];
      const archDocsInsights = [];
      
      if (patternsContext && context.archDocs?.available) {
        archDocsInsights.push(`Generated summary aligned with repository architecture and established patterns`);
      }

      if (semgrepSummary && semgrepSummary.totalFindings > 0) {
        archDocsInsights.push(`Incorporated ${semgrepSummary.totalFindings} static analysis findings into summary`);
      }

      return {
        ...state,
        currentSummary: detailedSummary,
        totalInputTokens: inputTokens,
        totalOutputTokens: outputTokens,
        archDocsInfluencedStages: archDocsStages,
        archDocsKeyInsights: archDocsInsights,
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      // Fallback to basic summary
      const fallbackSummary = `PR Analysis Summary:
- Files changed: ${totalFiles}
- Additions: ${totalAdditions}
- Deletions: ${totalDeletions}
- Fixes identified: ${fixes.length}

${context.title ? `Title: ${context.title}` : ''}`;

      return {
        ...state,
        currentSummary: fallbackSummary,
      };
    }
  }

  private async finalizeNode(state: typeof PRAgentState.State) {
    const { currentSummary, fixes, fileAnalyses, context } = state;
    
    console.log('✨ Finalizing analysis and generating recommendations...');

    // Build arch-docs context for recommendations if available
    let archDocsRefinementContext = '';
    if (context.archDocs?.available) {
      const allDocs = parseAllArchDocs();
      
      // Get recommendations from arch-docs
      const recommendationsDoc = allDocs.find(d => d.filename === 'recommendations');
      if (recommendationsDoc) {
        archDocsRefinementContext += `\n## Repository Improvement Guidelines\n\n${recommendationsDoc.content.substring(0, 2000)}\n`;
      }
      
      // Get code quality guidelines
      const qualityDoc = allDocs.find(d => d.filename === 'code-quality');
      if (qualityDoc) {
        archDocsRefinementContext += `\n## Code Quality Standards\n\n${qualityDoc.content.substring(0, 2000)}\n`;
      }
    }

    // Generate recommendations
    const refinementPrompt = `Based on this PR analysis, provide 3-5 specific, actionable recommendations.
    ${archDocsRefinementContext}
    
    PR Summary:
    ${currentSummary}
    
    Fixes Identified: ${fixes.length}
    ${fixes.length > 0 ? `\nKey fixes:\n${fixes.slice(0, 5).map(f => `- ${f.file}${f.line ? `:${f.line}` : ''}: ${f.comment.substring(0, 100)}...`).join('\n')}` : ''}
    
    Files Changed: ${fileAnalyses.size}
    
    ${archDocsRefinementContext ? 'Use the repository guidelines above to ensure recommendations align with established practices.\n' : ''}
    
    Provide a JSON array of recommendations:
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

      // Track arch-docs usage
      const archDocsStages = archDocsRefinementContext ? ['finalization'] : [];
      const archDocsInsights = [];
      
      if (archDocsRefinementContext && context.archDocs?.available) {
        archDocsInsights.push(`Generated ${recommendations.length} recommendations based on repository quality standards`);
      }

      return {
        ...state,
        recommendations,
        totalInputTokens: (state.totalInputTokens || 0) + inputTokens,
        totalOutputTokens: (state.totalOutputTokens || 0) + outputTokens,
        archDocsInfluencedStages: [...(state.archDocsInfluencedStages || []), ...archDocsStages],
        archDocsKeyInsights: [...(state.archDocsKeyInsights || []), ...archDocsInsights],
      };
    } catch (error) {
      console.error('Error generating recommendations:', error);
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
}

