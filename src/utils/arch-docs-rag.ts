/**
 * Arch-Docs RAG System
 * Retrieval Augmented Generation for architecture documentation
 */

import { ArchDoc, ArchDocSection, searchArchDocs } from './arch-docs-parser.js';

export interface ArchDocsContext {
  available: boolean;
  summary: string;
  relevantDocs: Array<{
    filename: string;
    title: string;
    section: string;
    content: string;
    relevance: number;
  }>;
  totalDocs: number;
}

/**
 * Build context from arch-docs based on PR analysis needs
 */
export function buildArchDocsContext(
  docs: ArchDoc[],
  prContext: {
    title?: string;
    files: Array<{ path: string; diff?: string }>;
    diff?: string;
  }
): ArchDocsContext {
  if (docs.length === 0) {
    return {
      available: false,
      summary: '',
      relevantDocs: [],
      totalDocs: 0,
    };
  }

  // Extract keywords from PR context
  const keywords = extractKeywords(prContext);
  
  // Search for relevant sections
  const relevantResults: Map<string, { doc: ArchDoc; section: ArchDocSection; relevance: number }> = new Map();
  
  // Search for each keyword and aggregate results
  for (const keyword of keywords) {
    const results = searchArchDocs(docs, keyword, 3);
    for (const result of results) {
      const key = `${result.doc.filename}:${result.section.heading}`;
      const existing = relevantResults.get(key);
      if (!existing || result.relevance > existing.relevance) {
        relevantResults.set(key, result);
      }
    }
  }

  // Also always include key documents
  const keyDocs = ['architecture', 'patterns', 'file-structure', 'security'];
  for (const keyDoc of keyDocs) {
    const doc = docs.find(d => d.filename === keyDoc);
    if (doc && doc.sections.length > 0) {
      const key = `${doc.filename}:${doc.sections[0].heading}`;
      if (!relevantResults.has(key)) {
        relevantResults.set(key, {
          doc,
          section: doc.sections[0],
          relevance: 3, // Base relevance for key docs
        });
      }
    }
  }

  // Convert to array and sort by relevance
  const sortedResults = Array.from(relevantResults.values())
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 10); // Top 10 most relevant sections

  // Build context
  const relevantDocs = sortedResults.map(result => ({
    filename: result.doc.filename,
    title: result.doc.title,
    section: result.section.heading,
    content: result.section.content.trim(),
    relevance: result.relevance,
  }));

  // Build summary
  const summary = buildContextSummary(docs, relevantDocs);

  return {
    available: true,
    summary,
    relevantDocs,
    totalDocs: docs.length,
  };
}

/**
 * Extract keywords from PR context for semantic search
 */
function extractKeywords(prContext: {
  title?: string;
  files: Array<{ path: string; diff?: string }>;
  diff?: string;
}): string[] {
  const keywords = new Set<string>();

  // From title
  if (prContext.title) {
    const titleWords = prContext.title
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3 && !isCommonWord(w));
    titleWords.forEach(w => keywords.add(w));
  }

  // From file paths
  for (const file of prContext.files) {
    const pathParts = file.path.split(/[\/\-_\.]/);
    for (const part of pathParts) {
      if (part.length > 3 && !isCommonWord(part.toLowerCase())) {
        keywords.add(part.toLowerCase());
      }
    }

    // Extract from file extensions and directories
    if (file.path.includes('test')) keywords.add('testing');
    if (file.path.includes('api')) keywords.add('api');
    if (file.path.includes('auth')) keywords.add('authentication');
    if (file.path.includes('db') || file.path.includes('database')) keywords.add('database');
    if (file.path.includes('security')) keywords.add('security');
    if (file.path.includes('schema')) keywords.add('schema');
    if (file.path.includes('config')) keywords.add('configuration');
    if (file.path.includes('migration')) keywords.add('migration');
  }

  // From diff content (look for imports, function names, etc.)
  if (prContext.diff) {
    // Extract import statements
    const importMatches = prContext.diff.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      const importPath = match[1];
      const parts = importPath.split(/[\/\-_]/);
      for (const part of parts) {
        if (part.length > 3 && !isCommonWord(part)) {
          keywords.add(part);
        }
      }
    }

    // Extract class and function names
    const classMatches = prContext.diff.matchAll(/class\s+(\w+)/g);
    for (const match of classMatches) {
      keywords.add(match[1].toLowerCase());
    }

    const functionMatches = prContext.diff.matchAll(/function\s+(\w+)/g);
    for (const match of functionMatches) {
      if (match[1].length > 3) {
        keywords.add(match[1].toLowerCase());
      }
    }
  }

  return Array.from(keywords).slice(0, 20); // Limit to top 20 keywords
}

/**
 * Check if a word is too common to be useful
 */
function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'been',
    'will', 'your', 'more', 'when', 'some', 'them', 'than', 'into', 'only',
    'other', 'then', 'also', 'make', 'made', 'like', 'time', 'very', 'just',
    'file', 'code', 'test', 'docs', 'info', 'data', 'type', 'name', 'index',
  ]);
  return commonWords.has(word);
}

/**
 * Build a summary of the context
 */
function buildContextSummary(docs: ArchDoc[], relevantDocs: any[]): string {
  const docTitles = docs.map(d => d.title).join(', ');
  const relevantCount = relevantDocs.length;
  
  let summary = `Architecture Documentation Context:\n`;
  summary += `- Total documents: ${docs.length}\n`;
  summary += `- Available: ${docTitles}\n`;
  summary += `- Relevant sections retrieved: ${relevantCount}\n\n`;
  
  if (relevantCount > 0) {
    summary += `Most relevant sections:\n`;
    relevantDocs.slice(0, 5).forEach((doc, i) => {
      summary += `${i + 1}. ${doc.title} - ${doc.section} (relevance: ${doc.relevance})\n`;
    });
  }

  return summary;
}

/**
 * Format arch-docs context for inclusion in prompts
 */
export function formatArchDocsForPrompt(context: ArchDocsContext): string {
  if (!context.available || context.relevantDocs.length === 0) {
    return '';
  }

  let prompt = '\n## Repository Architecture Context\n\n';
  prompt += 'The following sections from the architecture documentation are relevant to this PR:\n\n';

  for (const doc of context.relevantDocs) {
    prompt += `### ${doc.title} - ${doc.section}\n\n`;
    prompt += doc.content + '\n\n';
    prompt += '---\n\n';
  }

  return prompt;
}

/**
 * Get specific context for risk analysis
 */
export function getSecurityContext(docs: ArchDoc[]): string {
  const securityDoc = docs.find(d => d.filename === 'security');
  if (securityDoc) {
    return securityDoc.content;
  }
  return '';
}

/**
 * Get specific context for architecture understanding
 */
export function getArchitectureContext(docs: ArchDoc[]): string {
  const archDoc = docs.find(d => d.filename === 'architecture');
  if (archDoc) {
    return archDoc.content;
  }
  return '';
}

/**
 * Get specific context for patterns
 */
export function getPatternsContext(docs: ArchDoc[]): string {
  const patternsDoc = docs.find(d => d.filename === 'patterns');
  if (patternsDoc) {
    return patternsDoc.content;
  }
  return '';
}

