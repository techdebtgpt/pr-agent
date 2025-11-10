import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
export function parseDiff(diff) {
    const files = [];
    const lines = diff.split('\n');
    let currentFile = null;
    let currentDiff = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('diff --git')) {
            if (currentFile) {
                files.push({
                    ...currentFile,
                    diff: currentDiff.join('\n'),
                });
            }
            const match = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
            if (match) {
                const filePath = match[2] !== '/dev/null' ? match[2] : match[1];
                currentFile = {
                    path: filePath,
                    additions: 0,
                    deletions: 0,
                    language: detectLanguage(filePath),
                };
                currentDiff = [line];
            }
        }
        else if (line.startsWith('new file') && currentFile) {
            currentFile.status = 'A';
            currentDiff.push(line);
        }
        else if (line.startsWith('deleted file') && currentFile) {
            currentFile.status = 'D';
            currentDiff.push(line);
        }
        else if (line.startsWith('rename from') && currentFile) {
            currentFile.status = 'R';
            const oldPath = line.replace('rename from ', '').trim();
            currentFile.oldPath = oldPath;
            currentDiff.push(line);
        }
        else if (line.startsWith('+') && !line.startsWith('+++') && currentFile) {
            currentFile.additions = (currentFile.additions || 0) + 1;
            currentDiff.push(line);
        }
        else if (line.startsWith('-') && !line.startsWith('---') && currentFile) {
            currentFile.deletions = (currentFile.deletions || 0) + 1;
            currentDiff.push(line);
        }
        else if (currentFile) {
            currentDiff.push(line);
        }
    }
    if (currentFile) {
        files.push({
            ...currentFile,
            diff: currentDiff.join('\n'),
        });
    }
    return files;
}
function detectLanguage(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap = {
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        py: 'python',
        java: 'java',
        go: 'go',
        rs: 'rust',
        rb: 'ruby',
        php: 'php',
        cs: 'csharp',
        cpp: 'cpp',
        c: 'c',
        swift: 'swift',
        kt: 'kotlin',
        yaml: 'yaml',
        yml: 'yaml',
        json: 'json',
        md: 'markdown',
    };
    return languageMap[ext || ''] || 'unknown';
}
export function createFileAnalyzerTool() {
    return new DynamicStructuredTool({
        name: 'analyze_file',
        description: 'Analyze a specific file from the diff to identify risks, complexity, and provide recommendations',
        schema: z.object({
            filePath: z.string().describe('Path of the file to analyze'),
            diffContent: z.string().describe('The diff content for this file'),
        }),
        func: async ({ filePath, diffContent }) => {
            const additions = (diffContent.match(/^\+[^+]/gm) || []).length;
            const deletions = (diffContent.match(/^-[^-]/gm) || []).length;
            const totalChanges = additions + deletions;
            let complexity = 1;
            if (totalChanges > 100)
                complexity = 4;
            else if (totalChanges > 50)
                complexity = 3;
            else if (totalChanges > 20)
                complexity = 2;
            const risks = [];
            if (/eval\(|exec\(|system\(/i.test(diffContent)) {
                risks.push('Potentially dangerous function calls detected (eval, exec, system)');
            }
            if (/password|secret|api[_-]?key|token/i.test(diffContent) && /['"]/i.test(diffContent)) {
                risks.push('Possible hardcoded credentials or secrets');
            }
            if (/TODO|FIXME|XXX|HACK/i.test(diffContent)) {
                risks.push('Contains TODO/FIXME comments indicating incomplete work');
            }
            if (totalChanges > 200) {
                risks.push('Very large change set - difficult to review thoroughly');
            }
            const hasTryCatch = /try\s*{|catch\s*\(/i.test(diffContent);
            const hasThrow = /throw\s+/i.test(diffContent);
            if (hasThrow && !hasTryCatch) {
                risks.push('Throws errors without apparent error handling');
            }
            return JSON.stringify({
                path: filePath,
                additions,
                deletions,
                complexity,
                risks,
                language: detectLanguage(filePath),
            });
        },
    });
}
export function createRiskDetectorTool() {
    return new DynamicStructuredTool({
        name: 'detect_risks',
        description: 'Detect security, quality, and breaking change risks in the PR',
        schema: z.object({
            diff: z.string().describe('The full diff to analyze for risks'),
            context: z.string().optional().describe('Additional context about the changes'),
        }),
        func: async ({ diff, context }) => {
            const risks = [];
            if (/sql.*=.*\+|SQL.*=.*\+/i.test(diff)) {
                risks.push({
                    type: 'security',
                    severity: 'high',
                    description: 'Potential SQL injection - string concatenation in SQL queries',
                });
            }
            if (/innerHTML|dangerouslySetInnerHTML/i.test(diff)) {
                risks.push({
                    type: 'security',
                    severity: 'medium',
                    description: 'XSS risk - using innerHTML or dangerouslySetInnerHTML',
                });
            }
            if (/export\s+(interface|type|class|function)\s+\w+/i.test(diff) && /-.*export/i.test(diff)) {
                risks.push({
                    type: 'breaking',
                    severity: 'high',
                    description: 'Potential breaking change - modified or removed export',
                });
            }
            if ((diff.match(/console\.log/g) || []).length > 3) {
                risks.push({
                    type: 'quality',
                    severity: 'low',
                    description: 'Multiple console.log statements - consider using proper logging',
                });
            }
            if (/for.*for|while.*while/i.test(diff) && /O\(n\^2\)/i.test(diff)) {
                risks.push({
                    type: 'performance',
                    severity: 'medium',
                    description: 'Nested loops detected - potential O(n²) complexity',
                });
            }
            return JSON.stringify({
                riskCount: risks.length,
                risks,
                context: context || 'No additional context provided',
            });
        },
    });
}
export function createComplexityScorerTool() {
    return new DynamicStructuredTool({
        name: 'score_complexity',
        description: 'Calculate overall complexity score for the PR (1-5 scale)',
        schema: z.object({
            filesAnalyzed: z.array(z.any()).describe('Array of analyzed files'),
            totalChanges: z.number().describe('Total lines changed'),
        }),
        func: async ({ filesAnalyzed, totalChanges }) => {
            let score = 1;
            if (totalChanges > 500)
                score = Math.max(score, 5);
            else if (totalChanges > 300)
                score = Math.max(score, 4);
            else if (totalChanges > 150)
                score = Math.max(score, 3);
            else if (totalChanges > 50)
                score = Math.max(score, 2);
            const fileCount = filesAnalyzed.length;
            if (fileCount > 20)
                score = Math.max(score, 5);
            else if (fileCount > 10)
                score = Math.max(score, 4);
            else if (fileCount > 5)
                score = Math.max(score, 3);
            const avgFileComplexity = filesAnalyzed.reduce((sum, f) => sum + (f.complexity || 1), 0) / Math.max(fileCount, 1);
            if (avgFileComplexity >= 4)
                score = Math.max(score, 5);
            else if (avgFileComplexity >= 3)
                score = Math.max(score, 4);
            return JSON.stringify({
                overallComplexity: Math.min(score, 5),
                factors: {
                    totalChanges,
                    fileCount,
                    avgFileComplexity: avgFileComplexity.toFixed(1),
                },
                recommendation: score >= 4
                    ? 'High complexity - consider breaking into smaller PRs'
                    : score >= 3
                        ? 'Moderate complexity - ensure thorough testing'
                        : 'Low complexity - straightforward changes',
            });
        },
    });
}
export function createSummaryGeneratorTool() {
    return new DynamicStructuredTool({
        name: 'generate_summary',
        description: 'Generate a concise summary of PR changes',
        schema: z.object({
            files: z.array(z.any()).describe('Array of changed files'),
            title: z.string().optional().describe('PR title'),
        }),
        func: async ({ files, title }) => {
            const filesByType = {};
            let totalAdditions = 0;
            let totalDeletions = 0;
            files.forEach((file) => {
                const lang = file.language || 'other';
                filesByType[lang] = (filesByType[lang] || 0) + 1;
                totalAdditions += file.additions || 0;
                totalDeletions += file.deletions || 0;
            });
            const mainLanguage = Object.entries(filesByType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
            return JSON.stringify({
                title: title || 'Untitled PR',
                fileCount: files.length,
                totalAdditions,
                totalDeletions,
                netChange: totalAdditions - totalDeletions,
                mainLanguage,
                filesByType,
                summary: `Changes ${files.length} file(s) with ${totalAdditions} additions and ${totalDeletions} deletions. Primary language: ${mainLanguage}.`,
            });
        },
    });
}
export function createCodeSuggestionTool() {
    return new DynamicStructuredTool({
        name: 'suggest_code_fix',
        description: 'Generate a code fix suggestion based on a reviewer comment and the associated code snippet',
        schema: z.object({
            reviewerComment: z.string().describe('The reviewer\'s comment describing the issue'),
            codeSnippet: z.string().describe('The original code snippet to be fixed'),
            filePath: z.string().describe('Path of the file containing the code'),
            prTitle: z.string().optional().describe('PR title for context'),
            prContext: z.string().optional().describe('Additional PR context (repo, branch, etc.)'),
        }),
        func: async ({ reviewerComment, codeSnippet, filePath, prTitle, prContext }) => {
            const prompt = `You are an expert software engineer and code-fixer. You will take a reviewer comment and the associated code snippet and produce the corrected code snippet only.

Context:
${prContext || '(no additional context)'}
- PR Title: ${prTitle || '(unknown)'}
- File: ${filePath}

Reviewer comment:
${reviewerComment.trim()}

Original code snippet:
\`\`\`
${codeSnippet}
\`\`\`

Task:
1) Apply the reviewer's requested changes to the provided code snippet.
2) Output rules (MUST follow exactly):
   - Return only the corrected code snippet (no explanations, no markdown fences, no extra text).
   - If only a few lines changed you may return only the updated lines, but prefer returning the full corrected snippet when structural/context changes are required.
   - Preserve original code style and indentation.
   - If no changes are needed, reply with exactly: NO CHANGE
   - Do not include filenames, metadata, or commentary.

Produce the corrected code now.`;
            return JSON.stringify({
                filePath,
                originalCode: codeSnippet,
                reviewerComment,
                prompt,
                status: 'ready',
                message: 'Code suggestion prompt prepared. The agent will use this to generate the fix.',
            });
        },
    });
}
//# sourceMappingURL=pr-analysis-tools.js.map