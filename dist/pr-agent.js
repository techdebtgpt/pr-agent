"use strict";
/**
 * PR Analysis Agent
 * A true agent that reasons, plans, and iteratively analyzes PRs
 * - Makes autonomous decisions about what to analyze
 * - Uses tools to perform analysis
 * - Iteratively refines understanding
 * - Adapts strategy based on findings
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRAnalysisAgent = void 0;
const factory_1 = require("./providers/factory");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const child_process_1 = require("child_process");
class PRAnalysisAgent {
    provider;
    anthropic;
    apiKey;
    state;
    tools;
    constructor(config, apiKey) {
        this.provider = (0, factory_1.createProvider)(config);
        this.apiKey = apiKey;
        this.anthropic = new sdk_1.default({ apiKey });
        this.state = {
            analyzedFiles: new Map(),
            pendingFiles: [],
            context: [],
            insights: [],
            risks: new Set(),
            questions: [],
            strategy: 'comprehensive'
        };
        // Store output format for use in prompts
        this.state.outputFormat = 'terminal';
        // Register agent tools
        this.tools = new Map();
        this.registerTools();
    }
    /**
     * Register available tools for the agent
     */
    registerTools() {
        this.tools.set('analyze_file', {
            name: 'analyze_file',
            description: 'Analyze a specific file from the diff. Returns analysis with summary, risks, and complexity.',
            execute: async (params, state) => {
                // Build prompt based on mode (using same structure as analyzer.ts)
                const mode = state.mode || { summary: true, risks: true, complexity: true };
                const file = params.file;
                let fileContent = '';
                let analysisContext = '';
                // Handle different file statuses
                if (file.status === 'A') {
                    // New file: analyze the entire file
                    const fullContent = this.getFileContent(file.path);
                    if (fullContent) {
                        fileContent = fullContent;
                        analysisContext = `This is a NEW FILE being added to the repository. Analyze the entire file content for:\n`;
                    }
                    else {
                        // Fallback to diff if we can't get full content
                        fileContent = file.diff;
                        analysisContext = `This is a NEW FILE being added (full content not available, showing diff). Analyze it for:\n`;
                    }
                }
                else if (file.status === 'D') {
                    // Deleted file: analyze the deletion impact
                    const deletedContent = this.getDeletedFileContent(file.path);
                    if (deletedContent) {
                        fileContent = `=== DELETED FILE CONTENT ===\n${deletedContent}\n=== END DELETED FILE ===\n\n=== DIFF SHOWING DELETION ===\n${file.diff}`;
                        analysisContext = `This file is being DELETED. Analyze:\n1. What functionality is being removed\n2. If this deletion will break any dependencies\n3. Whether other files import or depend on this file\n4. If tests or documentation need updating\n5. Overall impact on the codebase\n\n`;
                    }
                    else {
                        fileContent = file.diff;
                        analysisContext = `This file is being DELETED (full content not available, showing diff). Analyze the deletion impact:\n`;
                    }
                }
                else {
                    // Modified file: analyze the diff (current behavior)
                    fileContent = file.diff;
                    analysisContext = `This is a MODIFIED FILE. Analyze the changes shown in the diff for:\n`;
                }
                // Use the provider's buildPrompt method (same as analyzer.ts)
                const request = {
                    diff: fileContent,
                    title: `Analyzing ${file.path}${file.status === 'A' ? ' (NEW FILE)' : file.status === 'D' ? ' (DELETED)' : ''}`,
                    files: [file.path]
                };
                // Create custom prompt based on mode with explicit format requirements
                const outputFormat = state.outputFormat || 'terminal';
                const isTerminal = outputFormat === 'terminal';
                let customPrompt = `Human: You are an expert software engineer and code reviewer. Analyze the following code change and respond EXACTLY in the format specified below.

${analysisContext}
${file.status === 'A' ? 'The following is the COMPLETE NEW FILE being added:' : file.status === 'D' ? 'The following shows the DELETED FILE and its removal:' : 'The following is the diff of the PR that needs reviewing:'}
${request.diff}
${request.title ? `PR Title: ${request.title}` : ''}

You MUST respond in EXACTLY this format (use these exact headers and structure):

**OUTPUT FORMATTING** (${isTerminal ? 'TERMINAL/CLI' : 'MARKDOWN'}):
${isTerminal ? `- Format for terminal/CLI display with chalk-like formatting
- Use simple, clean text formatting (avoid complex markdown)
- Use emoji sparingly for visual clarity (🔴 🟡 ✅ ⚠️)
- Use plain text with minimal markdown (avoid code blocks where possible)
- Keep lines concise and readable in monospace terminals
- Use simple bullet points with dashes (-)` : `- Use proper Markdown format for GitHub comments, docs, etc.
- Use proper headers (### for sections, ## for main sections)
- Use code blocks with language tags: \`\`\`typescript\ncode\n\`\`\`
- Use inline code backticks: \`functionName\` for function/class/import names
- Use bold (**text**) for emphasis on important points
- Use bullet points (- or *) for lists
- Ensure proper markdown syntax for GitHub rendering`}`;
                if (mode.summary) {
                    customPrompt += `\n\n${isTerminal ? 'Summary:' : '### Summary'}\n[Provide a brief summary of what the change does and its purpose]`;
                }
                if (mode.risks) {
                    customPrompt += `\n\n${isTerminal ? 'Potential Risks:' : '### Potential Risks'}\n[ONLY list CRITICAL risks that would BREAK the build or cause runtime failures. Examples: missing imports that prevent compilation, type errors that block build, deleted exports used elsewhere, circular dependencies causing build failures. DO NOT include minor issues like unused imports, code style, or non-critical concerns. Format as: "- [File: path/to/file] Description (line X)" or write "None" if no critical risks]`;
                }
                if (mode.complexity) {
                    customPrompt += `\n\n${isTerminal ? 'Complexity:' : '### Complexity'}\n[Rate as a number 1-5, where 1=trivial, 3=moderate, 5=very complex]`;
                }
                customPrompt += `\n\nSPECIFIC CHECKS TO PERFORM (ONLY FLAG CRITICAL/BREAKING ISSUES):
- Missing imports: ONLY flag if imported modules/classes/functions are missing and would cause compilation failure
- Type errors: ONLY flag TypeScript/type mismatches that would prevent compilation
- Build-breaking changes: Check for deleted exports that other files depend on, renamed functions/classes used elsewhere
- Circular dependencies: ONLY flag if they would cause build failures
- Syntax errors: Check for obvious syntax issues that would prevent compilation
- Missing dependencies: ONLY flag if new imports require package.json updates and code won't run without them
- Incorrect import paths: ONLY flag if import paths are wrong and would cause module resolution failures

IMPORTANT: 
${isTerminal ? `- DO NOT use markdown headers (no ## or ###) - use plain text sections
- Format for terminal: use simple text like "Summary:", "Potential Risks:", "Complexity:"
- In "Potential Risks", ONLY list CRITICAL risks that would BREAK the build:
  * Missing imports that prevent compilation
  * Type errors that block TypeScript compilation
  * Deleted exports that other files depend on
  * Circular dependencies causing build failures
  * Syntax errors preventing compilation
  * Missing package.json dependencies for new imports
  DO NOT include: unused imports, code style issues, minor refactoring suggestions, non-critical concerns
- For each risk, be specific: mention the exact file name, line number if possible, and the import/function/class name
- Format risks as: "- [File: path/to/file] Description of the risk (line X if applicable)"
- Keep formatting simple and readable in terminal` : `- Use the exact headers shown above (### Summary, ### Potential Risks, ### Complexity)
- In "Potential Risks", ONLY list CRITICAL/BREAKING risks (see terminal format criteria above)
- For each risk, be specific: mention the exact file name, line number if possible, and the import/function/class name
- Format risks as: "- [File: path/to/file] Description of the risk (line X if applicable)"`}
- Only flag risks that would actually prevent the code from building or running
- Keep the response under 300 words
- Start directly with the analysis (no introductions)
- If a section is not requested, omit it completely`;
                try {
                    // Temporarily override the provider's prompt by directly calling the API
                    const response = await this.anthropic.messages.create({
                        model: this.provider.config?.model || 'claude-sonnet-4-5-20250929',
                        max_tokens: this.provider.config?.maxTokens || 2000,
                        temperature: this.provider.config?.temperature || 0.2,
                        messages: [{ role: 'user', content: customPrompt }]
                    });
                    const text = response.content
                        .filter((block) => block.type === 'text')
                        .map((block) => block.text)
                        .join('');
                    // Use the response directly - it should already be in the correct format
                    const parsed = this.parseResponse(text);
                    const analysis = {
                        summary: parsed.summary,
                        risks: parsed.risks,
                        complexity: parsed.complexity,
                        provider: this.provider.getProviderType(),
                        model: this.provider.config?.model || 'claude-sonnet-4-5-20250929',
                        tokensUsed: response.usage?.input_tokens ?
                            response.usage.input_tokens + (response.usage.output_tokens || 0) :
                            undefined
                    };
                    state.analyzedFiles.set(params.file.path, analysis);
                    // Extract insights
                    if (analysis.complexity >= 4) {
                        state.insights.push(`${params.file.path} has high complexity (${analysis.complexity}/5)`);
                    }
                    analysis.risks.forEach(risk => state.risks.add(risk));
                    return {
                        success: true,
                        result: analysis,
                        file: params.file.path
                    };
                }
                catch (error) {
                    return {
                        success: false,
                        error: error.message,
                        file: params.file.path
                    };
                }
            }
        });
        this.tools.set('analyze_file_group', {
            name: 'analyze_file_group',
            description: 'Analyze a group of related files together (e.g., same directory or feature). More efficient for related changes.',
            execute: async (params, state) => {
                const mode = state.mode || { summary: true, risks: true, complexity: true };
                const results = [];
                for (const file of params.files) {
                    let fileContent = '';
                    let analysisContext = '';
                    // Handle different file statuses (same as analyze_file)
                    if (file.status === 'A') {
                        // New file: analyze the entire file
                        const fullContent = this.getFileContent(file.path);
                        if (fullContent) {
                            fileContent = fullContent;
                            analysisContext = `This is a NEW FILE being added to the repository. Analyze the entire file content for:\n`;
                        }
                        else {
                            fileContent = file.diff;
                            analysisContext = `This is a NEW FILE being added (full content not available, showing diff). Analyze it for:\n`;
                        }
                    }
                    else if (file.status === 'D') {
                        // Deleted file: analyze the deletion impact
                        const deletedContent = this.getDeletedFileContent(file.path);
                        if (deletedContent) {
                            fileContent = `=== DELETED FILE CONTENT ===\n${deletedContent}\n=== END DELETED FILE ===\n\n=== DIFF SHOWING DELETION ===\n${file.diff}`;
                            analysisContext = `This file is being DELETED. Analyze:\n1. What functionality is being removed\n2. If this deletion will break any dependencies\n3. Whether other files import or depend on this file\n4. If tests or documentation need updating\n5. Overall impact on the codebase\n\n`;
                        }
                        else {
                            fileContent = file.diff;
                            analysisContext = `This file is being DELETED (full content not available, showing diff). Analyze the deletion impact:\n`;
                        }
                    }
                    else {
                        // Modified file: analyze the diff
                        fileContent = file.diff;
                        analysisContext = `This is a MODIFIED FILE. Analyze the changes shown in the diff for:\n`;
                    }
                    // Use the same mode-aware prompt structure as analyze_file
                    const request = {
                        diff: fileContent,
                        title: `Analyzing ${file.path} (in group context)${file.status === 'A' ? ' (NEW FILE)' : file.status === 'D' ? ' (DELETED)' : ''}`,
                        files: params.files.map(f => f.path)
                    };
                    // Create custom prompt based on mode with explicit format requirements
                    const outputFormat = state.outputFormat || 'terminal';
                    const isTerminal = outputFormat === 'terminal';
                    let customPrompt = `Human: You are an expert software engineer and code reviewer. Analyze the following code change and respond EXACTLY in the format specified below.

${analysisContext}
${file.status === 'A' ? 'The following is the COMPLETE NEW FILE being added:' : file.status === 'D' ? 'The following shows the DELETED FILE and its removal:' : 'The following is the diff of the PR that needs reviewing:'}
${request.diff}
${request.title ? `PR Title: ${request.title}` : ''}

You MUST respond in EXACTLY this format (use these exact headers and structure):

**OUTPUT FORMATTING** (${isTerminal ? 'TERMINAL/CLI' : 'MARKDOWN'}):
${isTerminal ? `- Format for terminal/CLI display with chalk-like formatting
- Use simple, clean text formatting (avoid complex markdown)
- Use emoji sparingly for visual clarity (🔴 🟡 ✅ ⚠️)
- Use plain text with minimal markdown (avoid code blocks where possible)
- Keep lines concise and readable in monospace terminals
- Use simple bullet points with dashes (-)` : `- Use proper Markdown format for GitHub comments, docs, etc.
- Use proper headers (### for sections, ## for main sections)
- Use code blocks with language tags: \`\`\`typescript\ncode\n\`\`\`
- Use inline code backticks: \`functionName\` for function/class/import names
- Use bold (**text**) for emphasis on important points
- Use bullet points (- or *) for lists
- Ensure proper markdown syntax for GitHub rendering`}`;
                    if (mode.summary) {
                        customPrompt += `\n\n${isTerminal ? 'Summary:' : '### Summary'}\n[Provide a brief summary of what the change does and its purpose]`;
                    }
                    if (mode.risks) {
                        customPrompt += `\n\n${isTerminal ? 'Potential Risks:' : '### Potential Risks'}\n[ONLY list CRITICAL risks that would BREAK the build or cause runtime failures. Examples: missing imports that prevent compilation, type errors that block build, deleted exports used elsewhere, circular dependencies causing build failures. DO NOT include minor issues like unused imports, code style, or non-critical concerns. Format as: "- [File: path/to/file] Description (line X)" or write "None" if no critical risks]`;
                    }
                    if (mode.complexity) {
                        customPrompt += `\n\n${isTerminal ? 'Complexity:' : '### Complexity'}\n[Rate as a number 1-5, where 1=trivial, 3=moderate, 5=very complex]`;
                    }
                    customPrompt += `\n\nSPECIFIC CHECKS TO PERFORM (ONLY FLAG CRITICAL/BREAKING ISSUES):
- Missing imports: ONLY flag if imported modules/classes/functions are missing and would cause compilation failure
- Type errors: ONLY flag TypeScript/type mismatches that would prevent compilation
- Build-breaking changes: Check for deleted exports that other files depend on, renamed functions/classes used elsewhere
- Circular dependencies: ONLY flag if they would cause build failures
- Syntax errors: Check for obvious syntax issues that would prevent compilation
- Missing dependencies: ONLY flag if new imports require package.json updates and code won't run without them
- Incorrect import paths: ONLY flag if import paths are wrong and would cause module resolution failures

IMPORTANT: 
${isTerminal ? `- DO NOT use markdown headers (no ## or ###) - use plain text sections
- Format for terminal: use simple text like "Summary:", "Potential Risks:", "Complexity:"
- In "Potential Risks", ONLY list CRITICAL risks that would BREAK the build:
  * Missing imports that prevent compilation
  * Type errors that block TypeScript compilation
  * Deleted exports that other files depend on
  * Circular dependencies causing build failures
  * Syntax errors preventing compilation
  * Missing package.json dependencies for new imports
  DO NOT include: unused imports, code style issues, minor refactoring suggestions, non-critical concerns
- For each risk, be specific: mention the exact file name, line number if possible, and the import/function/class name
- Format risks as: "- [File: path/to/file] Description of the risk (line X if applicable)"
- Keep formatting simple and readable in terminal` : `- Use the exact headers shown above (### Summary, ### Potential Risks, ### Complexity)
- In "Potential Risks", ONLY list CRITICAL/BREAKING risks (see terminal format criteria above)
- For each risk, be specific: mention the exact file name, line number if possible, and the import/function/class name
- Format risks as: "- [File: path/to/file] Description of the risk (line X if applicable)"`}
- Only flag risks that would actually prevent the code from building or running
- Keep the response under 300 words
- Start directly with the analysis (no introductions)
- If a section is not requested, omit it completely`;
                    try {
                        const response = await this.anthropic.messages.create({
                            model: this.provider.config?.model || 'claude-sonnet-4-5-20250929',
                            max_tokens: this.provider.config?.maxTokens || 2000,
                            temperature: this.provider.config?.temperature || 0.2,
                            messages: [{ role: 'user', content: customPrompt }]
                        });
                        const text = response.content
                            .filter((block) => block.type === 'text')
                            .map((block) => block.text)
                            .join('');
                        // Use the response directly - it should already be in the correct format
                        const parsed = this.parseResponse(text);
                        const analysis = {
                            summary: parsed.summary,
                            risks: parsed.risks,
                            complexity: parsed.complexity,
                            provider: this.provider.getProviderType(),
                            model: this.provider.config?.model || 'claude-sonnet-4-5-20250929',
                            tokensUsed: response.usage?.input_tokens ?
                                response.usage.input_tokens + (response.usage.output_tokens || 0) :
                                undefined
                        };
                        state.analyzedFiles.set(file.path, analysis);
                        analysis.risks.forEach(risk => state.risks.add(risk));
                        results.push({ file: file.path, analysis });
                    }
                    catch (error) {
                        results.push({ file: file.path, error: error.message });
                    }
                }
                return { success: true, results };
            }
        });
        this.tools.set('get_file_priority', {
            name: 'get_file_priority',
            description: 'Determine which files should be analyzed first based on importance, risk, or dependencies.',
            execute: async (params, state) => {
                return params.files
                    .map(file => ({
                    file,
                    score: this.calculatePriorityScore(file, state)
                }))
                    .sort((a, b) => b.score - a.score)
                    .map(item => item.file);
            }
        });
        this.tools.set('synthesize_findings', {
            name: 'synthesize_findings',
            description: 'Synthesize all analyzed files into overall insights, identifying patterns and cross-file concerns.',
            execute: async (params, state) => {
                // Check if we have any analyzed files
                if (state.analyzedFiles.size === 0) {
                    // Return a basic synthesis if no files were analyzed
                    return {
                        summary: `No files were analyzed. ${state.pendingFiles.length} file(s) remain pending analysis.`,
                        risks: Array.from(state.risks),
                        complexity: 3,
                        recommendations: ['Consider analyzing at least some files to get insights'],
                        provider: this.provider.getProviderType(),
                        model: this.provider.config?.model || 'claude-sonnet-4-5-20250929'
                    };
                }
                const fileSummaries = Array.from(state.analyzedFiles.entries())
                    .map(([path, analysis]) => `File: ${path}\n  Summary: ${analysis.summary}\n  Risks: ${analysis.risks.join(', ')}\n  Complexity: ${analysis.complexity}/5`)
                    .join('\n\n');
                // Ensure we have content for the diff
                const synthesisContent = fileSummaries || 'No file summaries available';
                const outputFormat = state.outputFormat || 'terminal';
                const isTerminal = outputFormat === 'terminal';
                const synthesisPrompt = `You are synthesizing PR analysis findings from ${state.analyzedFiles.size} analyzed files.

Analyzed Files Summary:
${synthesisContent}

Current Context:
${state.context.join('\n') || 'No additional context'}

Please provide:
${isTerminal ? `1. Overall PR summary (plain text, no markdown headers - just "Summary:" as label)
   - Provide a COMPREHENSIVE and DETAILED summary (150-400 words)
   - Describe the overall purpose and scope of the PR
   - Explain what major changes were made and why
   - Describe the architecture, design decisions, and key components
   - Mention the main files/changes and their roles
   - Explain how the changes fit together
   - Be descriptive and informative, not just "name transformation and core addition"
2. Critical risks ONLY - only list risks that would BREAK the build or cause runtime failures (plain text, format as "File: path/to/file\n  - Risk 1\n  - Risk 2")
   - ONLY include build-breaking issues, missing critical imports, type errors that prevent compilation
   - DO NOT include minor issues, code style, or non-critical concerns
   - If no critical risks, just write "None"
3. Overall complexity rating (1-5)
4. Priority recommendations (plain text, no markdown)` : `1. Overall PR summary (use ### Summary header, 150-400 words, comprehensive and detailed)
2. Critical risks ONLY (use ### Risks header, format as "- [File: path/to/file] Description")
3. Overall complexity rating (use ### Complexity header with number 1-5)
4. Priority recommendations (use ### Recommendations header)`}

IMPORTANT:
${isTerminal ? `- NO markdown headers (no ## or ###) - use plain text labels like "Summary:", "Risks:", "Complexity:"
- Group risks by file when possible to show where issues are located
- Keep formatting simple and terminal-friendly
- Avoid code blocks unless absolutely necessary` : `- Use proper markdown headers
- Group risks by file when possible
- Use proper markdown formatting`}
- Summary should be COMPREHENSIVE (150-400 words) - describe architecture, design, components, relationships, purpose
- Only flag CRITICAL/BREAKING risks - skip minor issues, code style, or non-critical concerns
- Remove duplicate information
- Focus on actionable, high-priority items`;
                try {
                    const outputFormat = state.outputFormat || 'terminal';
                    const request = {
                        diff: synthesisContent,
                        title: 'Synthesizing PR analysis',
                        outputFormat: outputFormat
                    };
                    const synthesis = await this.provider.analyze(request);
                    state.insights.push(synthesis.summary);
                    if (synthesis.recommendations) {
                        state.insights.push(...synthesis.recommendations);
                    }
                    return synthesis;
                }
                catch (error) {
                    // Fallback synthesis if AI synthesis fails
                    const allRisks = Array.from(state.risks);
                    const avgComplexity = state.analyzedFiles.size > 0
                        ? Math.round(Array.from(state.analyzedFiles.values())
                            .reduce((sum, a) => sum + a.complexity, 0) / state.analyzedFiles.size)
                        : 3;
                    return {
                        summary: `Analyzed ${state.analyzedFiles.size} file(s). ${allRisks.length > 0 ? `Found ${allRisks.length} risk(s).` : 'No major risks identified.'}`,
                        risks: allRisks,
                        complexity: avgComplexity,
                        recommendations: state.insights.length > 0 ? state.insights.slice(0, 5) : [],
                        provider: this.provider.getProviderType(),
                        model: this.provider.config?.model || 'claude-sonnet-4-5-20250929'
                    };
                }
            }
        });
        this.tools.set('decide_next_action', {
            name: 'decide_next_action',
            description: 'Reason about what to analyze next based on current findings. Returns recommendation for next steps.',
            execute: async (params, state) => {
                // If no pending files, suggest synthesis
                if (state.pendingFiles.length === 0) {
                    return {
                        action: 'synthesize',
                        reasoning: 'All files analyzed, ready to synthesize',
                        targets: []
                    };
                }
                // Get prioritized files first
                const prioritized = await this.executeTool('get_file_priority', { files: state.pendingFiles });
                const reasoning = await this.reason(`Current state:
- Analyzed ${state.analyzedFiles.size} files
- Pending: ${state.pendingFiles.length} files
- Risks found: ${state.risks.size}
- Insights: ${state.insights.length}

Top priority pending files:
${prioritized.slice(0, 5).map((f, i) => `${i + 1}. ${f.path} (${f.additions}+ ${f.deletions}-)`).join('\n')}

        You MUST return an action to ANALYZE files. Available actions:
- "analyze_file": Analyze a single file (use for important/complex files)
- "analyze_group": Analyze multiple related files together (use for small related changes)
- "synthesize": ONLY when you've analyzed ALL files (${state.analyzedFiles.size} analyzed, ${state.pendingFiles.length} remaining. Need to analyze at least ${Math.max(3, Math.floor(state.pendingFiles.length * 0.8))} more files before synthesizing)

IMPORTANT: Continue analyzing files until most are done. Only suggest "synthesize" when:
- All files are analyzed

Choose files from the priority list above. Return JSON with action and target file paths:
{"action": "analyze_file" | "analyze_group" | "synthesize", "reasoning": "why this action", "targets": ["path1", "path2"]}`);
                try {
                    const cleanedReasoning = this.extractJSON(reasoning);
                    return JSON.parse(cleanedReasoning);
                }
                catch (error) {
                    // Fallback: return a default action if JSON parsing fails
                    console.warn('Failed to parse agent decision, using default action');
                    // Default: analyze first few high-priority files
                    const prioritized = await this.executeTool('get_file_priority', { files: state.pendingFiles });
                    const defaultTargets = prioritized.slice(0, Math.min(3, state.pendingFiles.length));
                    return {
                        action: defaultTargets.length > 1 ? 'analyze_group' : 'analyze_file',
                        reasoning: 'Default: analyzing high-priority files',
                        targets: defaultTargets.map((f) => f.path)
                    };
                }
            }
        });
    }
    /**
     * Parse AI response - extracts sections based on the expected format
     * Handles both terminal (plain text) and markdown formats
     */
    parseResponse(response) {
        const normalized = response.trim();
        // Extract Summary section - handle both terminal and markdown formats
        const summaryPatterns = [
            /### Summary\s*\n(.*?)(?=\n### |\nSummary:|\nPotential Risks:|\nComplexity:|$)/is,
            /Summary:\s*\n(.*?)(?=\n### |\nSummary:|\nPotential Risks:|\nComplexity:|$)/is
        ];
        let summary = '';
        for (const pattern of summaryPatterns) {
            const match = normalized.match(pattern);
            if (match && match[1]?.trim()) {
                summary = match[1].trim();
                break;
            }
        }
        if (!summary) {
            // Fallback: get first paragraph
            const firstLine = normalized.split('\n')[0]?.trim();
            summary = firstLine && !firstLine.match(/^(Summary|Potential Risks|Complexity):/i)
                ? firstLine
                : normalized.substring(0, 200);
        }
        // Extract Risks section - handle both formats
        const risksPatterns = [
            /### Potential Risks\s*\n(.*?)(?=\n### |\nSummary:|\nPotential Risks:|\nComplexity:|$)/is,
            /Potential Risks:\s*\n(.*?)(?=\n### |\nSummary:|\nPotential Risks:|\nComplexity:|$)/is
        ];
        let risks = [];
        for (const pattern of risksPatterns) {
            const match = normalized.match(pattern);
            if (match && match[1]?.trim()) {
                const risksText = match[1].trim();
                if (risksText.toLowerCase().includes('none') || risksText.toLowerCase().includes('no risks')) {
                    risks = [];
                }
                else {
                    // Split by lines and extract bullet points
                    risksText.split('\n').forEach(line => {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
                            const riskText = trimmed.substring(2).trim();
                            if (riskText.length > 0 && !riskText.toLowerCase().includes('none')) {
                                risks.push(riskText);
                            }
                        }
                        else if (trimmed.match(/^\d+\.\s+/)) {
                            const riskText = trimmed.replace(/^\d+\.\s+/, '').trim();
                            if (riskText.length > 0 && !riskText.toLowerCase().includes('none')) {
                                risks.push(riskText);
                            }
                        }
                        else if (trimmed.length > 0 && !trimmed.toLowerCase().includes('none')) {
                            risks.push(trimmed);
                        }
                    });
                }
                break;
            }
        }
        // Extract Complexity - handle both formats
        const complexityPatterns = [
            /### Complexity\s*\n\s*(\d+)/i,
            /Complexity:\s*\n\s*(\d+)/i,
            /Complexity.*?(\d+)/i,
            /(\d+)\s*\/\s*5/i
        ];
        let complexity = 3; // Default
        for (const pattern of complexityPatterns) {
            const match = normalized.match(pattern);
            if (match && match[1]) {
                const parsed = parseInt(match[1]);
                if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
                    complexity = parsed;
                    break;
                }
            }
        }
        return {
            summary,
            risks,
            complexity
        };
    }
    /**
     * Extract JSON from markdown code blocks
     */
    extractJSON(text) {
        // Try to find JSON in code blocks first
        const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonBlockMatch) {
            return jsonBlockMatch[1];
        }
        // Try to find JSON object directly
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return jsonMatch[0];
        }
        // Return as-is if no JSON found
        return text.trim();
    }
    /**
     * Agent reasoning - uses Claude to make decisions
     */
    async reason(prompt) {
        const toolsDescription = Array.from(this.tools.values())
            .map(tool => `- ${tool.name}: ${tool.description}`)
            .join('\n');
        const fullPrompt = `You are a PR analysis agent. You have access to these tools:

${toolsDescription}

${prompt}

Think step by step and provide a clear, actionable response.`;
        try {
            // Get model from config - need to access it properly
            const model = this.provider.config?.model || 'claude-sonnet-4-5-20250929';
            const response = await this.anthropic.messages.create({
                model: model,
                max_tokens: 1000,
                temperature: 0.3,
                messages: [{
                        role: 'user',
                        content: fullPrompt
                    }]
            });
            return response.content
                .filter((block) => block.type === 'text')
                .map(block => block.text)
                .join('');
        }
        catch (error) {
            throw new Error(`Reasoning failed: ${error.message}`);
        }
    }
    /**
     * Calculate priority score for a file
     */
    calculatePriorityScore(file, state) {
        let score = file.additions + file.deletions;
        // New and deleted files are high priority (structural changes)
        if (file.status === 'A')
            score += 30; // New files: analyze completely
        if (file.status === 'D')
            score += 40; // Deleted files: check for breaking changes
        if (file.status === 'R')
            score += 20; // Renamed files: moderate priority
        // High priority file types
        if (file.path.match(/(config|setup|package|\.env)/i))
            score += 50;
        if (file.path.match(/(auth|security|permission)/i))
            score += 40;
        if (file.path.match(/test/i))
            score += 30;
        if (file.path.match(/\.(ts|js|py|java|go)$/))
            score += 10;
        // Already analyzed files have lower priority
        if (state.analyzedFiles.has(file.path))
            score = 0;
        return score;
    }
    /**
     * Check if a file should be skipped from analysis
     */
    shouldSkipFile(filePath) {
        // Skip dist files and other build artifacts
        if (filePath.startsWith('dist/') || filePath.includes('/dist/')) {
            return true;
        }
        if (filePath.startsWith('node_modules/') || filePath.includes('/node_modules/')) {
            return true;
        }
        // Skip .map files in dist
        if (filePath.endsWith('.map') && filePath.includes('dist/')) {
            return true;
        }
        // Skip .d.ts files in dist
        if (filePath.includes('.d.ts') && filePath.includes('dist/')) {
            return true;
        }
        return false;
    }
    /**
     * Parse diff into individual files
     * Detects new, modified, and deleted files
     */
    parseDiff(diff) {
        const files = [];
        let currentFile = null;
        let currentDiff = '';
        const lines = diff.split('\n');
        let i = 0;
        let isNewFile = false;
        let isDeletedFile = false;
        let skipCurrentFile = false;
        while (i < lines.length) {
            const line = lines[i];
            if (line.startsWith('diff --git')) {
                if (currentFile && currentDiff && !skipCurrentFile) {
                    files.push({
                        path: currentFile.path,
                        additions: currentFile.additions || 0,
                        deletions: currentFile.deletions || 0,
                        diff: currentDiff,
                        language: currentFile.language,
                        status: currentFile.status || 'M',
                        oldPath: currentFile.oldPath
                    });
                }
                const match = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
                if (match) {
                    const oldPath = match[1];
                    const newPath = match[2];
                    // Determine status
                    let status = 'M';
                    if (oldPath === '/dev/null') {
                        status = 'A'; // New file
                    }
                    else if (newPath === '/dev/null') {
                        status = 'D'; // Deleted file
                    }
                    else if (oldPath !== newPath) {
                        status = 'R'; // Renamed file
                    }
                    const filePath = status === 'D' ? oldPath : newPath;
                    skipCurrentFile = this.shouldSkipFile(filePath);
                    if (!skipCurrentFile) {
                        currentFile = {
                            path: filePath,
                            additions: 0,
                            deletions: 0,
                            diff: '',
                            status,
                            oldPath: status === 'R' || status === 'D' ? oldPath : undefined
                        };
                        currentDiff = line + '\n';
                        currentFile.language = this.detectLanguage(currentFile.path);
                        isNewFile = false;
                        isDeletedFile = false;
                    }
                    else {
                        currentFile = null;
                        currentDiff = '';
                    }
                }
            }
            else if (currentFile && !skipCurrentFile) {
                // Detect file status from diff headers
                if (line.startsWith('new file mode') || line.startsWith('new file')) {
                    isNewFile = true;
                    currentFile.status = 'A';
                }
                else if (line.startsWith('deleted file mode') || line.startsWith('deleted file')) {
                    isDeletedFile = true;
                    currentFile.status = 'D';
                }
                else if (line.startsWith('rename from')) {
                    currentFile.status = 'R';
                    currentFile.oldPath = line.replace('rename from ', '');
                }
                else if (line.startsWith('rename to')) {
                    currentFile.path = line.replace('rename to ', '');
                }
                // Count additions/deletions (excluding header lines)
                if (line.startsWith('+') && !line.startsWith('+++')) {
                    currentFile.additions = (currentFile.additions || 0) + 1;
                }
                else if (line.startsWith('-') && !line.startsWith('---')) {
                    currentFile.deletions = (currentFile.deletions || 0) + 1;
                }
                currentDiff += line + '\n';
            }
            i++;
        }
        if (currentFile && currentDiff && !skipCurrentFile) {
            files.push({
                path: currentFile.path,
                additions: currentFile.additions || 0,
                deletions: currentFile.deletions || 0,
                diff: currentDiff,
                language: currentFile.language,
                status: currentFile.status || 'M',
                oldPath: currentFile.oldPath
            });
        }
        return files;
    }
    /**
     * Detect programming language from file extension
     */
    detectLanguage(filePath) {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const langMap = {
            'ts': 'typescript', 'js': 'javascript', 'tsx': 'typescript', 'jsx': 'javascript',
            'py': 'python', 'java': 'java', 'go': 'go', 'rs': 'rust', 'rb': 'ruby',
            'php': 'php', 'cpp': 'cpp', 'c': 'c', 'cs': 'csharp', 'swift': 'swift',
            'kt': 'kotlin', 'sh': 'bash', 'yaml': 'yaml', 'yml': 'yaml',
            'json': 'json', 'md': 'markdown', 'html': 'html', 'css': 'css'
        };
        return ext ? langMap[ext] : undefined;
    }
    /**
     * Get full file content from git (for new files)
     * Returns null if file doesn't exist or can't be read
     */
    getFileContent(filePath, ref = 'HEAD') {
        try {
            // First try to get from working directory (for new uncommitted files)
            const fs = require('fs');
            const path = require('path');
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                return content;
            }
        }
        catch (err) {
            // Continue to try git
        }
        try {
            // Try to get file from git (for committed files)
            const content = (0, child_process_1.execSync)(`git show ${ref}:${filePath}`, {
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024 // 10MB limit
            });
            return content;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get deleted file content from git (for deleted files)
     * Returns null if file can't be read
     */
    getDeletedFileContent(filePath, ref = 'HEAD~1') {
        try {
            const content = (0, child_process_1.execSync)(`git show ${ref}:${filePath}`, {
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024 // 10MB limit
            });
            return content;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Execute a tool
     */
    async executeTool(toolName, params) {
        const tool = this.tools.get(toolName);
        if (!tool) {
            throw new Error(`Unknown tool: ${toolName}`);
        }
        return await tool.execute(params, this.state);
    }
    /**
     * Agent planning phase - decides strategy
     */
    async planStrategy(diff, prTitle) {
        const files = this.parseDiff(diff);
        this.state.pendingFiles = files;
        const strategyPrompt = `I need to analyze a PR with ${files.length} files.

PR Title: ${prTitle || 'Untitled'}
Files: ${files.slice(0, 10).map(f => f.path).join(', ')}${files.length > 10 ? `... and ${files.length - 10} more` : ''}

What analysis strategy should I use?
- comprehensive: Analyze all files thoroughly
- focused: Focus on high-risk/important files only
- deep-dive: Deep analysis of critical files, summary of others

Consider:
- Number of files (${files.length})
- File types present
- Size of changes

Return JSON: {"strategy": "comprehensive" | "focused" | "deep-dive", "reasoning": "..."}`;
        try {
            const decision = await this.reason(strategyPrompt);
            const cleanedDecision = this.extractJSON(decision);
            const parsed = JSON.parse(cleanedDecision);
            this.state.strategy = parsed.strategy || 'comprehensive';
            this.state.context.push(`Strategy: ${this.state.strategy}. ${parsed.reasoning || 'Based on PR structure'}`);
        }
        catch (error) {
            // Default strategy
            console.warn('Failed to parse strategy decision, using default');
            this.state.strategy = files.length > 20 ? 'focused' : 'comprehensive';
            this.state.context.push(`Using default strategy: ${this.state.strategy}`);
        }
    }
    /**
     * Main agent loop - reasons, plans, executes iteratively
     */
    async analyze(diff, prTitle, mode, outputFormat = 'terminal') {
        // Set mode in state
        this.state.mode = mode || { summary: true, risks: true, complexity: true };
        this.state.outputFormat = outputFormat;
        // Phase 1: Planning
        console.log('🧠 Agent: Planning analysis strategy...');
        await this.planStrategy(diff, prTitle);
        console.log(`📋 Strategy: ${this.state.strategy}`);
        // Phase 2: Iterative analysis loop
        // Increase max iterations to ensure all files can be analyzed
        const totalFiles = this.state.pendingFiles.length;
        const maxIterations = Math.max(30, totalFiles * 2); // At least 30, or 2x file count
        let iterations = 0;
        console.log(`📊 Total files to analyze: ${totalFiles}`);
        while (this.state.pendingFiles.length > 0 && iterations < maxIterations) {
            iterations++;
            // Reason about next action
            console.log(`\n🤔 Agent: Reasoning about next action (iteration ${iterations})...`);
            const nextAction = await this.executeTool('decide_next_action', {});
            console.log(`   Decision: ${nextAction.action}`);
            if (nextAction.reasoning) {
                this.state.context.push(`Iteration ${iterations}: ${nextAction.reasoning}`);
            }
            // Execute the decision
            try {
                if (nextAction.action === 'analyze_file' && nextAction.targets?.length > 0) {
                    const file = this.state.pendingFiles.find(f => nextAction.targets.includes(f.path));
                    if (file) {
                        const statusLabel = file.status === 'A' ? ' (NEW)' : file.status === 'D' ? ' (DELETED)' : file.status === 'R' ? ' (RENAMED)' : '';
                        console.log(`   🔍 Analyzing: ${file.path}${statusLabel}`);
                        await this.executeTool('analyze_file', { file });
                        this.state.pendingFiles = this.state.pendingFiles.filter(f => f.path !== file.path);
                    }
                    else {
                        console.warn(`   ⚠️  File not found in pending files: ${nextAction.targets[0]}`);
                        // Fallback: analyze the first pending file
                        if (this.state.pendingFiles.length > 0) {
                            const fallbackFile = this.state.pendingFiles[0];
                            const statusLabel = fallbackFile.status === 'A' ? ' (NEW)' : fallbackFile.status === 'D' ? ' (DELETED)' : fallbackFile.status === 'R' ? ' (RENAMED)' : '';
                            console.log(`   🔍 Fallback: Analyzing ${fallbackFile.path}${statusLabel}`);
                            await this.executeTool('analyze_file', { file: fallbackFile });
                            this.state.pendingFiles = this.state.pendingFiles.filter(f => f.path !== fallbackFile.path);
                        }
                    }
                }
                else if (nextAction.action === 'analyze_group' && nextAction.targets?.length > 0) {
                    const files = this.state.pendingFiles.filter(f => nextAction.targets.includes(f.path));
                    if (files.length > 0) {
                        const fileLabels = files.map(f => {
                            const statusLabel = f.status === 'A' ? ' (NEW)' : f.status === 'D' ? ' (DELETED)' : f.status === 'R' ? ' (RENAMED)' : '';
                            return `${f.path}${statusLabel}`;
                        });
                        console.log(`   🔍 Analyzing group: ${fileLabels.join(', ')}`);
                        await this.executeTool('analyze_file_group', { files });
                        this.state.pendingFiles = this.state.pendingFiles.filter(f => !nextAction.targets.includes(f.path));
                    }
                }
                else if (nextAction.action === 'synthesize') {
                    // Only synthesize if we have analyzed files
                    if (this.state.analyzedFiles.size > 0) {
                        console.log(`   📊 Synthesizing findings...`);
                        break; // Exit loop to synthesize
                    }
                    else {
                        console.warn(`   ⚠️  Cannot synthesize: no files analyzed yet`);
                        // Force analyze at least one file
                        if (this.state.pendingFiles.length > 0) {
                            const file = this.state.pendingFiles[0];
                            const statusLabel = file.status === 'A' ? ' (NEW)' : file.status === 'D' ? ' (DELETED)' : file.status === 'R' ? ' (RENAMED)' : '';
                            console.log(`   🔍 Force analyzing: ${file.path}${statusLabel}`);
                            await this.executeTool('analyze_file', { file });
                            this.state.pendingFiles = this.state.pendingFiles.filter(f => f.path !== file.path);
                        }
                    }
                }
                else {
                    // Invalid action - fallback to analyzing first pending file
                    console.warn(`   ⚠️  Invalid action: ${nextAction.action}, falling back to analyze first file`);
                    if (this.state.pendingFiles.length > 0) {
                        const file = this.state.pendingFiles[0];
                        const statusLabel = file.status === 'A' ? ' (NEW)' : file.status === 'D' ? ' (DELETED)' : file.status === 'R' ? ' (RENAMED)' : '';
                        console.log(`   🔍 Analyzing: ${file.path}${statusLabel}`);
                        await this.executeTool('analyze_file', { file });
                        this.state.pendingFiles = this.state.pendingFiles.filter(f => f.path !== file.path);
                    }
                }
            }
            catch (error) {
                console.warn(`   ⚠️  Tool execution failed: ${error.message}`);
                // Continue with next iteration - try next file
                if (this.state.pendingFiles.length > 0 && iterations < maxIterations - 1) {
                    const file = this.state.pendingFiles[0];
                    const statusLabel = file.status === 'A' ? ' (NEW)' : file.status === 'D' ? ' (DELETED)' : file.status === 'R' ? ' (RENAMED)' : '';
                    console.log(`   🔍 Retrying with: ${file.path}${statusLabel}`);
                    try {
                        await this.executeTool('analyze_file', { file });
                        this.state.pendingFiles = this.state.pendingFiles.filter(f => f.path !== file.path);
                    }
                    catch (retryError) {
                        console.warn(`   ⚠️  Retry also failed, removing file from queue`);
                        this.state.pendingFiles = this.state.pendingFiles.filter(f => f.path !== file.path);
                    }
                }
            }
            // Don't stop early - let the agent continue analyzing files
            // Only break if agent explicitly decides to synthesize AND we have enough files analyzed
            const analyzedCount = this.state.analyzedFiles.size;
            const totalFiles = this.state.pendingFiles.length + analyzedCount;
            const progressRatio = analyzedCount / totalFiles;
            if (nextAction.action === 'synthesize') {
                // Only allow synthesis if we've analyzed a significant portion of files
                if (progressRatio >= 0.8 || analyzedCount >= Math.min(20, totalFiles * 0.8)) {
                    console.log(`   ℹ️  Analyzed ${analyzedCount}/${totalFiles} files (${(progressRatio * 100).toFixed(0)}%), ready to synthesize`);
                    break;
                }
                else {
                    // Force continuation if too early
                    console.log(`   ℹ️  Only ${(progressRatio * 100).toFixed(0)}% analyzed, continuing...`);
                    // Override the synthesize decision and continue
                    if (this.state.pendingFiles.length > 0) {
                        const file = this.state.pendingFiles[0];
                        const statusLabel = file.status === 'A' ? ' (NEW)' : file.status === 'D' ? ' (DELETED)' : file.status === 'R' ? ' (RENAMED)' : '';
                        console.log(`   🔍 Force analyzing: ${file.path}${statusLabel}`);
                        try {
                            await this.executeTool('analyze_file', { file });
                            this.state.pendingFiles = this.state.pendingFiles.filter(f => f.path !== file.path);
                        }
                        catch (error) {
                            console.warn(`   ⚠️  Force analysis failed, continuing...`);
                        }
                    }
                }
            }
        }
        // Phase 3: Synthesis
        console.log('\n📊 Agent: Synthesizing findings...');
        const synthesis = await this.executeTool('synthesize_findings', {});
        // Use the outputFormat from the function parameter (already set in state)
        const currentOutputFormat = this.state.outputFormat || outputFormat;
        // Phase 4: Build final result
        const overallComplexity = Math.max(...Array.from(this.state.analyzedFiles.values()).map(a => a.complexity), 1);
        // Build risks grouped by file for better display
        const risksByFile = new Map();
        this.state.analyzedFiles.forEach((analysis, path) => {
            if (analysis.risks.length > 0) {
                risksByFile.set(path, analysis.risks);
            }
        });
        // Collect all unique risks, preserving file context where possible
        const allRisks = new Set();
        this.state.analyzedFiles.forEach((analysis, path) => {
            analysis.risks.forEach(risk => {
                // If risk already includes file path, use as-is, otherwise add file context
                if (risk.includes('[File:') || risk.includes(`[${path}]`)) {
                    allRisks.add(risk);
                }
                else {
                    allRisks.add(`[File: ${path}] ${risk}`);
                }
            });
        });
        // Clean summary - remove duplicates and markdown headers if terminal
        let cleanSummary = synthesis.summary || `Analyzed ${this.state.analyzedFiles.size} files`;
        if (this.state.mode && currentOutputFormat === 'terminal') {
            // Remove markdown headers from summary for terminal
            cleanSummary = cleanSummary.replace(/^#+\s*PR Analysis:?\s*/im, '');
            cleanSummary = cleanSummary.replace(/^##\s*Summary\s*/im, '');
            cleanSummary = cleanSummary.trim();
        }
        return {
            summary: cleanSummary,
            fileAnalyses: this.state.analyzedFiles,
            overallComplexity,
            overallRisks: Array.from(allRisks),
            recommendations: synthesis.recommendations || [],
            insights: this.state.insights,
            reasoning: this.state.context,
            provider: synthesis.provider,
            model: synthesis.model,
            totalTokensUsed: Array.from(this.state.analyzedFiles.values())
                .reduce((sum, a) => sum + (a.tokensUsed || 0), 0) + (synthesis.tokensUsed || 0),
            mode: this.state.mode
        };
    }
}
exports.PRAnalysisAgent = PRAnalysisAgent;
//# sourceMappingURL=pr-agent.js.map