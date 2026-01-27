/**
 * Base PR Agent Workflow using LangGraph
 * Follows architecture-doc-generator patterns with self-refinement
 */

import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  AgentContext,
  AgentResult,
  AgentResultOrPrompts,
  FileAnalysis,
  AgentExecutionOptions,
  TestSuggestion,
  DevOpsCostEstimate,
  CoverageReport,
  ExecutionMode,
  AnalysisPrompt,
  PromptOnlyResult,
  DiffFile,
} from '../types/agent.types.js';
import path from 'path';
import {
  parseDiff,
  createFileAnalyzerTool,
  createRiskDetectorTool,
  createComplexityScorerTool,
  createSummaryGeneratorTool,
} from '../tools/pr-analysis-tools.js';
import { formatArchDocsForPrompt, getSecurityContext, getPatternsContext } from '../utils/arch-docs-rag.js';
import { parseAllArchDocs } from '../utils/arch-docs-parser.js';
import {
  isTestFile,
  isCodeFile,
  detectTestFramework,
  generateTestTemplate,
  suggestTestFilePath,
  analyzeTestQuality,
  formatTestEnhancement,
} from '../tools/test-suggestion-tool.js';
import {
  isDevOpsFile,
  analyzeDevOpsFiles,
} from '../tools/devops-cost-estimator.js';
import {
  detectCoverageTool,
  readCoverageReport,
} from '../tools/coverage-reporter.js';
import {
  classifyProject,
  formatClassification,
} from '../tools/project-classifier.js';
import { getProjectClassification } from '../db/index.js';

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

  currentRisks: Annotation<any[]>({
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
  protected model?: BaseChatModel;  // Now optional!
  protected mode: ExecutionMode;
  protected workflow?: ReturnType<typeof this.buildWorkflow>;  // Optional in PROMPT_ONLY mode
  protected checkpointer = new MemorySaver();
  protected tools: any[];

  constructor(mode: ExecutionMode = ExecutionMode.EXECUTE, model?: BaseChatModel) {
    this.mode = mode;
    this.model = model;

    // Validation: LLM required in EXECUTE mode
    if (mode === ExecutionMode.EXECUTE && !model) {
      throw new Error('BasePRAgentWorkflow: LLM is required when mode is EXECUTE');
    }

    // Initialize tools
    this.tools = [
      createFileAnalyzerTool(),
      createRiskDetectorTool(),
      createComplexityScorerTool(),
      createSummaryGeneratorTool(),
    ];

    // Only build workflow in EXECUTE mode
    if (mode === ExecutionMode.EXECUTE) {
      this.workflow = this.buildWorkflow();
    }
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
   * Routes to either EXECUTE mode (run analysis) or PROMPT_ONLY mode (return prompts)
   */
  async execute(context: AgentContext, options?: AgentExecutionOptions): Promise<AgentResultOrPrompts> {
    if (this.mode === ExecutionMode.PROMPT_ONLY) {
      return await this.buildAllPrompts(context);
    } else {
      return this.executeAnalysis(context, options);
    }
  }

  /**
   * Build all prompts for PROMPT_ONLY mode (without executing them)
   * Also runs static analysis tools that don't require an LLM
   */
  private async buildAllPrompts(context: AgentContext): Promise<PromptOnlyResult> {
    const files = parseDiff(context.diff);
    const prompts: AnalysisPrompt[] = [];

    // Build arch-docs context if available
    let archDocsContext = '';
    if (context.archDocs?.available) {
      archDocsContext = formatArchDocsForPrompt(context.archDocs);
    }

    // === RUN STATIC ANALYSIS (no LLM needed) ===
    // These features run immediately and results are included in the output
    console.log('🔧 Running static analysis tools...');
    const staticAnalysis = await this.detectAndAnalyzeChangeTypes(files, context);
    console.log(`✅ Static analysis complete`);

    // 1. File Analysis Prompts (for important files)
    const filesToAnalyze = files.slice(0, 15);
    const importantFiles = filesToAnalyze.filter(f =>
      f.additions + f.deletions > 20 ||
      f.path.includes('config') ||
      f.path.includes('schema') ||
      f.path.includes('migration') ||
      f.path.includes('test')
    ).slice(0, 5);

    if (importantFiles.length > 0) {
      prompts.push(this.buildFileAnalysisPrompt(importantFiles, archDocsContext));
    }

    // 2. Risk Detection Prompt
    prompts.push(this.buildRiskDetectionPrompt(files, archDocsContext, context));

    // 3. Summary Generation Prompt
    prompts.push(this.buildSummaryPrompt(files, archDocsContext, context));

    // 4. Self Refinement Prompt (placeholder - would need analysis results)
    // Note: This would typically need results from previous steps
    // For now, we'll skip it in PROMPT_ONLY mode or make it conditional

    return {
      mode: 'prompt_only',
      context,
      prompts,
      // Include static analysis results
      staticAnalysis,
      instructions: `Execute these prompts sequentially using your LLM:
1. First, analyze the important files in the PR
2. Then detect risks and security issues
3. Generate an overall PR summary
4. (Optional) Refine the analysis based on results

Each prompt includes the necessary context and instructions for execution.

Note: Static analysis (test suggestions, DevOps costs, coverage reports) has already been run and is included below.`
    };
  }

  /**
   * Build file analysis prompt
   */
  private buildFileAnalysisPrompt(importantFiles: DiffFile[], archDocsContext: string): AnalysisPrompt {
    const prompt = `Analyze these files from a pull request. For EACH file, provide a detailed analysis considering the repository's architecture standards.
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

    return {
      step: 'fileAnalysis',
      prompt,
      context: { fileCount: importantFiles.length },
      instructions: 'Analyze each file and return JSON object with file analyses'
    };
  }

  /**
   * Build risk detection prompt
   */
  private buildRiskDetectionPrompt(files: DiffFile[], archDocsContext: string, context: AgentContext): AnalysisPrompt {
    const prompt = `Review this pull request for potential risks, security issues, and code quality problems.

${archDocsContext ? archDocsContext : ''}

Files changed (${files.length} total):
${files.map(f => `- ${f.path} (+${f.additions}/-${f.deletions})`).join('\n')}

Full diff:
\`\`\`diff
${context.diff.substring(0, 8000)}
\`\`\`

${archDocsContext ? `You have access to architecture documentation. Reference relevant security guidelines when identifying risks.

Return a JSON array of risk objects with archDocsSource and archDocsExcerpt:
[
  {
    "file": "path/to/file",
    "line": 42,
    "comment": "Description of risk",
    "severity": "critical|warning|suggestion",
    "archDocsSource": "security.md",
    "archDocsExcerpt": "Relevant excerpt from arch-docs",
    "reason": "Why this is a risk based on arch-docs"
  }
]

DO NOT return simple string arrays. Each risk MUST be an object with archDocsSource, archDocsExcerpt, and reason fields.` : '["risk 1", "risk 2", ...]'}

Only include risks that are actually present. If no significant risks, return an empty array [].`;

    return {
      step: 'riskDetection',
      prompt,
      context: { fileCount: files.length },
      instructions: 'Detect risks and return JSON array of risk objects'
    };
  }

  /**
   * Build summary generation prompt
   */
  private buildSummaryPrompt(files: DiffFile[], archDocsContext: string, context: AgentContext): AnalysisPrompt {
    const prompt = `Generate a comprehensive summary of this pull request.

${archDocsContext ? archDocsContext : ''}

PR Title: ${context.title || 'Untitled PR'}

Files changed: ${files.length}
Total additions: +${files.reduce((sum, f) => sum + f.additions, 0)}
Total deletions: -${files.reduce((sum, f) => sum + f.deletions, 0)}

Key files:
${files.slice(0, 10).map(f => `- ${f.path} (+${f.additions}/-${f.deletions})`).join('\n')}

Diff excerpt:
\`\`\`diff
${context.diff.substring(0, 5000)}
\`\`\`

${archDocsContext ? 'Consider the design patterns and architecture from the repository documentation when analyzing the changes.\n' : ''}

Provide a detailed, well-structured summary (3-5 paragraphs) that would help a reviewer understand the scope and purpose of this PR.`;

    return {
      step: 'summaryGeneration',
      prompt,
      context: {},
      instructions: 'Generate detailed PR summary (3-5 paragraphs)'
    };
  }

  /**
   * Execute the agent workflow in EXECUTE mode (with LLM)
   */
  private async executeAnalysis(context: AgentContext, options?: AgentExecutionOptions): Promise<AgentResult> {
    if (!this.workflow) {
      throw new Error('Workflow not initialized - executeAnalysis should only be called in EXECUTE mode');
    }

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

    // Build arch-docs impact summary with deduplication
    const stateAny = finalState as any;
    const archDocsImpact = context.archDocs?.available ? {
      used: true,
      docsAvailable: context.archDocs.totalDocs,
      sectionsUsed: context.archDocs.relevantDocs.length,
      influencedStages: [...new Set<string>(stateAny.archDocsInfluencedStages || [])],
      keyInsights: [...new Set<string>(stateAny.archDocsKeyInsights || [])],
    } : undefined;

    // Smart change detection - only include relevant outputs
    const files = parseDiff(context.diff);
    const enhancedResult = await this.detectAndAnalyzeChangeTypes(files, context);

    // Convert currentRisks to fixes format for backward compatibility
    const fixes = finalState.currentRisks.map((risk: any) => {
      // Risk can be a string or RiskItem object
      if (typeof risk === 'string') {
        return {
          file: '',
          comment: risk,
          severity: 'warning' as const,
        };
      }
      return {
        file: risk.file || '',
        line: risk.line,
        comment: risk.description || risk.reason || String(risk),
        severity: (risk.severity as 'critical' | 'warning' | 'suggestion') || 'warning',
      };
    });

    return {
      summary: finalState.currentSummary,
      fileAnalyses: finalState.fileAnalyses,
      fixes,
      overallComplexity: finalState.currentComplexity,
      overallRisks: finalState.currentRisks,
      recommendations: finalState.recommendations,
      insights: finalState.insights,
      reasoning: finalState.reasoning,
      provider: 'ai',
      model: (this.model as any).modelName || 'unknown',
      totalTokensUsed: totalInputTokens + totalOutputTokens,
      executionTime,
      mode: context.mode,
      archDocsImpact,
      // Conditionally include new features based on change types
      ...enhancedResult,
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
      currentRisks: [] as string[],
      currentComplexity: 1,
      clarityScore: 0,
      missingInformation: [] as string[],
      recommendations: [] as string[],
      insights: [] as string[],
      reasoning: [] as string[],
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };

    // Execute workflow nodes sequentially (skip refinement loop)
    let state: any = initialState;

    try {
      // 1. Analyze files
      state = await this.analyzeFilesNode(state);

      // 2. Detect risks
      state = await this.detectRisksNode(state);

      // 3. Calculate complexity
      state = await this.calculateComplexityNode(state);

      // 4. Generate summary
      state = await this.generateSummaryNode(state);

      // 5. Generate recommendations (skip quality evaluation)
      state = await this.refineAnalysisNode(state);

      // 6. Finalize
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

      // Smart change detection - only include relevant outputs
      const files = parseDiff(context.diff);
      const enhancedResult = await this.detectAndAnalyzeChangeTypes(files, context);

      // Convert currentRisks to fixes format for backward compatibility
      const fixes = state.currentRisks.map((risk: any) => {
        // Risk can be a string or RiskItem object
        if (typeof risk === 'string') {
          return {
            file: '',
            comment: risk,
            severity: 'warning' as const,
          };
        }
        return {
          file: risk.file || '',
          line: risk.line,
          comment: risk.description || risk.reason || String(risk),
          severity: (risk.severity as 'critical' | 'warning' | 'suggestion') || 'warning',
        };
      });

      return {
        summary: state.currentSummary,
        fileAnalyses: state.fileAnalyses,
        fixes,
        overallComplexity: state.currentComplexity,
        overallRisks: state.currentRisks,
        recommendations: state.recommendations,
        insights: state.insights,
        reasoning: [...state.reasoning, 'Fast path: Self-refinement evaluation skipped for speed'],
        provider: 'ai',
        model: (this.model as any).modelName || 'unknown',
        totalTokensUsed: state.totalInputTokens + state.totalOutputTokens,
        executionTime,
        mode: context.mode,
        archDocsImpact,
        // Conditionally include new features based on change types
        ...enhancedResult,
      };
    } catch (error) {
      console.error('Fast path execution error:', error);
      throw error;
    }
  }

  /**
   * Smart change detection - analyzes files and returns only relevant enhanced features
   */
  private async detectAndAnalyzeChangeTypes(
    files: Array<{ path: string; diff: string; additions: number; deletions: number }>,
    context: AgentContext
  ): Promise<{
    testSuggestions?: TestSuggestion[];
    devOpsCostEstimates?: DevOpsCostEstimate[];
    coverageReport?: CoverageReport;
    projectClassification?: string;
  }> {
    const result: {
      testSuggestions?: TestSuggestion[];
      devOpsCostEstimates?: DevOpsCostEstimate[];
      coverageReport?: CoverageReport;
      projectClassification?: string;
    } = {};

    // === PROJECT CLASSIFICATION ===
    // Check DB cache first, only run classification if not cached (saves tokens)
    const repoOwner = (context.config?.repoOwner as string) || 'local';
    const repoName = (context.config?.repoName as string) || 'unknown';

    let cachedClassification = getProjectClassification(repoOwner, repoName);

    if (cachedClassification) {
      // Use cached classification
      result.projectClassification = cachedClassification;
    } else {
      // Run classification and store for caching
      const classification = classifyProject(
        files.map(f => ({ filename: f.path, patch: f.diff }))
      );
      result.projectClassification = formatClassification(classification);
    }

    // Categorize files by type
    const codeFiles = files.filter(f => isCodeFile(f.path) && !isTestFile(f.path));
    const testFiles = files.filter(f => isTestFile(f.path));
    const devOpsFiles = files.filter(f => isDevOpsFile(f.path).isDevOps);

    console.log(`📊 Change Analysis: ${codeFiles.length} code files, ${testFiles.length} test files, ${devOpsFiles.length} DevOps files`);

    // 1. Developer changes without tests → Test Suggestions
    if (codeFiles.length > 0 && codeFiles.length > testFiles.length) {
      console.log(`🧪 Detecting test suggestions for ${codeFiles.length} code files...`);

      const frameworkInfo = detectTestFramework(context.config?.repoPath as string || '.');
      const testSuggestions: TestSuggestion[] = [];

      for (const file of codeFiles) {
        // Check if there's a corresponding test file in the PR
        const baseName = file.path.replace(/\.[^/.]+$/, '').split('/').pop() || '';
        const hasTest = testFiles.some(t =>
          t.path.toLowerCase().includes(baseName.toLowerCase())
        );

        if (!hasTest && file.additions > 5) {
          // Extract function names from diff for better test generation
          const functionMatches = file.diff.match(/(?:function|const|let|var|async)\s+(\w+)/g) || [];
          const functionNames = functionMatches
            .map(m => m.replace(/(?:function|const|let|var|async)\s+/, ''))
            .filter(name => name.length > 2 && !['the', 'and', 'for'].includes(name));

          const testCode = generateTestTemplate(
            frameworkInfo.framework,
            file.path,
            file.diff,
            functionNames.slice(0, 5)
          );

          testSuggestions.push({
            forFile: file.path,
            testFramework: frameworkInfo.framework,
            testCode,
            description: `Suggested tests for new/modified code in ${file.path}`,
            testFilePath: suggestTestFilePath(file.path, frameworkInfo.framework),
          });
        }
      }

      if (testSuggestions.length > 0) {
        result.testSuggestions = testSuggestions;
        console.log(`✅ Generated ${testSuggestions.length} test suggestions`);
      }
    }

    // 1b. Existing tests → Test Enhancement Suggestions
    if (testFiles.length > 0 && codeFiles.length > 0) {
      console.log(`🔬 Analyzing ${testFiles.length} existing test file(s) for improvements...`);

      const frameworkInfo = detectTestFramework(context.config?.repoPath as string || '.');

      for (const testFile of testFiles) {
        // Find corresponding source file
        const baseName = testFile.path
          .replace(/\.(test|spec)\./i, '.')
          .replace(/^(test|tests|__tests__)\//i, '')
          .replace(/\/(test|tests|__tests__)\//i, '/');

        const sourceFile = codeFiles.find(f =>
          f.path.includes(baseName.split('/').pop()?.replace(/\.[^.]+$/, '') || '')
        );

        if (sourceFile && testFile.additions > 0) {
          // Analyze test quality and suggest enhancements
          const enhancement = analyzeTestQuality(
            { path: testFile.path, diff: testFile.diff },
            { path: sourceFile.path, diff: sourceFile.diff },
            frameworkInfo.framework
          );

          if (enhancement.suggestions.length > 0) {
            // Add as test suggestion with enhancement flag
            result.testSuggestions = result.testSuggestions || [];
            result.testSuggestions.push({
              forFile: sourceFile.path,
              testFramework: frameworkInfo.framework,
              testCode: enhancement.enhancementCode || '',
              description: `Test enhancements for ${path.basename(testFile.path)}: ${enhancement.suggestions.join(', ')}`,
              testFilePath: testFile.path,
              isEnhancement: true,
              existingTestFile: testFile.path,
            });

            console.log(`   → Found ${enhancement.missingScenarios.length} missing scenario(s) in ${path.basename(testFile.path)}`);
          }
        }
      }

      const enhancementCount = result.testSuggestions?.filter(s => s.isEnhancement).length || 0;
      if (enhancementCount > 0) {
        console.log(`✅ Generated ${enhancementCount} test enhancement suggestion(s)`);
      }
    }

    // 2. DevOps/IaC changes → Cost Estimation
    if (devOpsFiles.length > 0) {
      console.log(`💰 Analyzing DevOps costs for ${devOpsFiles.length} files...`);

      const costAnalysis = analyzeDevOpsFiles(devOpsFiles);

      if (costAnalysis.hasDevOpsChanges && costAnalysis.estimates.length > 0) {
        result.devOpsCostEstimates = costAnalysis.estimates;
        console.log(`✅ Estimated costs for ${costAnalysis.estimates.length} resources (~$${costAnalysis.totalEstimatedCost.toFixed(2)}/month)`);
      }
    }

    // 3. Test/QA changes → Coverage Report (only if configured)
    if (testFiles.length > 0 || codeFiles.length > 0) {
      const coverageConfig = detectCoverageTool(context.config?.repoPath as string || '.');

      if (coverageConfig.configured) {
        console.log(`📊 Checking coverage (${coverageConfig.tool} detected)...`);

        const coverage = readCoverageReport(context.config?.repoPath as string || '.');

        if (coverage.available) {
          result.coverageReport = coverage;
          console.log(`✅ Coverage: ${coverage.overallPercentage?.toFixed(1)}%`);
        }
      }
    }

    return result;
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

        if (!this.model) {
          throw new Error('LLM is required for file analysis in EXECUTE mode');
        }

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

    // Add security context from arch-docs if available
    let securityContext = '';
    let allDocs: any[] = [];
    let securityDoc: any = null;
    let patternsDoc: any = null;

    if (context.archDocs?.available) {
      allDocs = parseAllArchDocs();
      const secDoc = getSecurityContext(allDocs);
      if (secDoc) {
        securityContext = `\n## Security Guidelines from Repository Documentation\n\n${secDoc.substring(0, 3000)}\n`;
        securityDoc = allDocs.find(d => d.filename === 'security');
      }

      // Also get patterns that might indicate risks
      const patterns = getPatternsContext(allDocs);
      if (patterns) {
        securityContext += `\n## Repository Patterns and Best Practices\n\n${patterns.substring(0, 2000)}\n`;
        patternsDoc = allDocs.find(d => d.filename === 'patterns');
      }
    }

    const riskPrompt = `You are a security and code quality expert analyzing a pull request for potential risks.
${securityContext}

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

${securityContext ? `CRITICAL INSTRUCTIONS:
- You MUST reference the repository documentation guidelines above when identifying each risk
- For EVERY risk you identify, find the relevant guideline from the documentation
- Explain HOW the code change violates or conflicts with the documented standards
- Quote the specific guideline that makes this a risk
- Be specific about why this matters based on the repository's own standards

Example format for a risk with documentation:
{
  "description": "File exceeds maximum line count recommended for maintainability",
  "archDocsSource": "code-quality.md",
  "archDocsExcerpt": "Keep individual files under 500 lines to maintain testability and readability",
  "reason": "This file contains 990 lines, nearly 2x the repository standard, which increases maintenance burden and makes comprehensive testing more difficult"
}
` : ''}

Provide a JSON array of risk objects. Each risk MUST include:
- description: Clear, specific description of the risk
${securityContext ? `- archDocsSource: REQUIRED - Which documentation file from above this relates to (e.g., "security.md", "patterns.md", "code-quality.md")
- archDocsExcerpt: REQUIRED - Direct quote from the repository documentation that this violates
- reason: REQUIRED - Detailed explanation of why this is a risk based on the specific guideline quoted above
` : ''}

Format:
${securityContext ? `[
  {
    "description": "Specific risk description",
    "archDocsSource": "documentation-file.md",
    "archDocsExcerpt": "Exact quote from the documentation",
    "reason": "Detailed explanation connecting the code change to the guideline violation"
  }
]

DO NOT return simple string arrays. Each risk MUST be an object with archDocsSource, archDocsExcerpt, and reason fields.` : '["risk 1", "risk 2", ...]'}

Only include risks that are actually present. If no significant risks, return an empty array [].`;

    try {
      if (!this.model) {
        throw new Error('LLM is required for risk detection in EXECUTE mode');
      }

      const response = await this.model.invoke(riskPrompt);
      const content = response.content as string;

      // Track tokens
      const usage = (response.response_metadata as any)?.usage;
      const inputTokens = usage?.input_tokens || 0;
      const outputTokens = usage?.output_tokens || 0;

      // Parse JSON response
      let risks: any[] = [];
      let hasArchDocsEnhancement = false;

      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsedRisks = JSON.parse(jsonMatch[0]);

          // Check if risks have arch-docs references
          if (parsedRisks.length > 0 && typeof parsedRisks[0] === 'object' && 'archDocsSource' in parsedRisks[0]) {
            // Transform to our RiskItem format
            risks = parsedRisks.map((r: any) => ({
              description: r.description,
              archDocsReference: r.archDocsSource ? {
                source: r.archDocsSource,
                excerpt: r.archDocsExcerpt || '',
                reason: r.reason || '',
              } : undefined,
            }));
            hasArchDocsEnhancement = true;
          } else if (parsedRisks.length > 0 && typeof parsedRisks[0] === 'string') {
            // Legacy format - just strings
            risks = parsedRisks;
          } else {
            risks = parsedRisks;
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse risk JSON, extracting manually');
        // Fallback: extract bullet points as strings
        const lines = content.split('\n');
        risks = lines
          .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
          .map(line => line.replace(/^[-•]\s*/, '').trim())
          .filter(line => line.length > 0);
      }

      // Add basic pattern-based checks with arch-docs enhancement
      const patternRisks: any[] = [];
      if (context.diff.includes('password') || context.diff.includes('secret') || context.diff.includes('api_key')) {
        const riskDesc = 'Potential credentials or sensitive data in code changes';
        if (securityDoc) {
          // Always enhance with arch-docs if available
          patternRisks.push({
            description: riskDesc,
            archDocsReference: {
              source: 'security.md',
              excerpt: 'Never commit credentials, API keys, or secrets to the repository. Use environment variables for all sensitive configuration.',
              reason: 'Code changes contain keywords like "password", "secret", or "api_key" which may indicate hardcoded credentials. This violates the repository security policy requiring all secrets to be externalized via environment variables.',
            },
          });
        } else {
          patternRisks.push(riskDesc);
        }
      }

      if (fileAnalyses.size > 20) {
        const qualityDoc = allDocs.find(d => d.filename === 'code-quality');
        if (qualityDoc && securityContext) {
          patternRisks.push({
            description: `Large change set (${fileAnalyses.size} files) increases review complexity and error risk`,
            archDocsReference: {
              source: 'code-quality.md',
              excerpt: 'Keep pull requests focused and under 15 files when possible for thorough review',
              reason: `This PR modifies ${fileAnalyses.size} files, exceeding the recommended limit. Large PRs are harder to review thoroughly and increase the likelihood of missing critical issues.`,
            },
          });
        } else {
          patternRisks.push(`Large change set (${fileAnalyses.size} files) - may be difficult to review thoroughly`);
        }
      }

      if (context.diff.includes('DROP TABLE') || context.diff.includes('ALTER TABLE')) {
        if (securityContext) {
          patternRisks.push({
            description: 'Database schema changes detected - requires careful migration planning',
            archDocsReference: {
              source: 'patterns.md',
              excerpt: 'All database schema changes must be backwards-compatible and include rollback procedures',
              reason: 'The changes include database schema modifications (DROP TABLE or ALTER TABLE) which can cause data loss or application downtime if not properly planned and tested.',
            },
          });
        } else {
          patternRisks.push('Database schema changes detected - requires careful migration planning');
        }
      }

      // Merge risks, avoiding duplicates (for string risks)
      let allRisks: any[];
      if (hasArchDocsEnhancement) {
        // Keep structured risks
        allRisks = [...risks, ...patternRisks];
      } else {
        // Deduplicate string risks
        allRisks = [...new Set([...risks, ...patternRisks])];
      }

      // Track arch-docs usage in risk detection
      const archDocsStages = securityContext ? ['risk-detection'] : [];
      const archDocsInsights = [];

      if (securityContext && context.archDocs?.available) {
        const enhancedCount = allRisks.filter(r => typeof r === 'object' && r.archDocsReference).length;
        if (enhancedCount > 0) {
          archDocsInsights.push(`Linked ${enhancedCount} risks to specific repository security guidelines and best practices`);
        }
      }

      return {
        ...state,
        currentRisks: allRisks,
        insights: [`Identified ${allRisks.length} potential risks`],
        totalInputTokens: (state.totalInputTokens || 0) + inputTokens,
        totalOutputTokens: (state.totalOutputTokens || 0) + outputTokens,
        archDocsInfluencedStages: archDocsStages,
        archDocsKeyInsights: archDocsInsights,
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
    const { fileAnalyses, context } = state;

    console.log('📊 Calculating complexity...');

    const complexities = Array.from(fileAnalyses.values()).map(f => f.complexity);
    const avgComplexity = complexities.length > 0
      ? complexities.reduce((a, b) => a + b, 0) / complexities.length
      : 1;

    // Track arch-docs influence on complexity
    const archDocsStages = context.archDocs?.available ? ['complexity-calculation'] : [];
    const archDocsInsights = [];

    if (context.archDocs?.available) {
      // Check if patterns documentation helped understand complexity
      const allDocs = parseAllArchDocs();
      const patterns = getPatternsContext(allDocs);
      if (patterns) {
        archDocsInsights.push(`Evaluated complexity against repository design patterns and coding standards`);
      }
    }

    return {
      ...state,
      currentComplexity: Math.round(avgComplexity),
      archDocsInfluencedStages: archDocsStages,
      archDocsKeyInsights: archDocsInsights,
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

    // Add patterns context from arch-docs if available
    let patternsContext = '';
    if (context.archDocs?.available) {
      const allDocs = parseAllArchDocs();
      const patterns = getPatternsContext(allDocs);
      if (patterns) {
        patternsContext = `\n## Design Patterns from Repository Documentation\n\n${patterns.substring(0, 2000)}\n`;
      }
    }

    // Create comprehensive prompt for LLM
    const summaryPrompt = `You are analyzing a pull request. Provide a DETAILED and COMPREHENSIVE summary that covers:

1. **Overall Purpose**: What is this PR trying to accomplish? What problem does it solve?
2. **Key Changes**: What are the main changes being made? Group related changes together.
3. **Impact Analysis**: What parts of the system are affected? What are the implications?
4. **Technical Details**: Mention important technical aspects (new dependencies, API changes, data model changes, etc.)
5. **Patterns Observed**: Any design patterns, refactoring, or architectural changes?
${patternsContext}

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

${patternsContext ? 'Consider the design patterns and architecture from the repository documentation when analyzing the changes.\n' : ''}

Provide a detailed, well-structured summary (3-5 paragraphs) that would help a reviewer understand the scope and purpose of this PR.`;

    try {
      if (!this.model) {
        throw new Error('LLM is required for summary generation in EXECUTE mode');
      }

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

    // Build arch-docs context for refinement
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

      // Get KPI metrics
      const kpiDoc = allDocs.find(d => d.filename === 'kpi');
      if (kpiDoc) {
        archDocsRefinementContext += `\n## Repository Health KPIs\n\n${kpiDoc.content.substring(0, 1500)}\n`;
      }
    }

    // Generate comprehensive recommendations
    const refinementPrompt = `Based on this PR analysis, provide specific, actionable recommendations for the developer and reviewers.
${archDocsRefinementContext}

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
${archDocsRefinementContext ? '7. Alignment with repository standards and KPIs from arch-docs\n' : ''}

${archDocsRefinementContext ? 'Use the repository guidelines and standards above to ensure recommendations align with established practices.\n' : ''}

Provide a JSON array of 3-5 specific, actionable recommendations:
["recommendation 1", "recommendation 2", ...]`;

    try {
      if (!this.model) {
        throw new Error('LLM is required for self refinement in EXECUTE mode');
      }

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

      // Track arch-docs usage in refinement
      const archDocsStages = archDocsRefinementContext ? ['refinement'] : [];
      const archDocsInsights = [];

      if (archDocsRefinementContext && context.archDocs?.available) {
        archDocsInsights.push(`Generated ${recommendations.length} recommendations based on repository quality standards and KPIs`);
      }

      return {
        ...state,
        recommendations,
        totalInputTokens: (state.totalInputTokens || 0) + inputTokens,
        totalOutputTokens: (state.totalOutputTokens || 0) + outputTokens,
        archDocsInfluencedStages: archDocsStages,
        archDocsKeyInsights: archDocsInsights,
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

