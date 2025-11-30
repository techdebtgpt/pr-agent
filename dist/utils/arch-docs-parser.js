/**
 * Arch-Docs Parser
 * Parses .arch-docs markdown files for RAG system
 */
import * as fs from 'fs';
import * as path from 'path';
/**
 * Check if .arch-docs folder exists
 */
export function archDocsExists(repoPath = process.cwd()) {
    const archDocsPath = path.join(repoPath, '.arch-docs');
    return fs.existsSync(archDocsPath) && fs.statSync(archDocsPath).isDirectory();
}
/**
 * Get all markdown files from .arch-docs folder
 */
export function getArchDocsFiles(repoPath = process.cwd()) {
    const archDocsPath = path.join(repoPath, '.arch-docs');
    if (!archDocsExists(repoPath)) {
        return [];
    }
    try {
        const files = fs.readdirSync(archDocsPath);
        return files
            .filter(file => file.endsWith('.md'))
            .map(file => path.join(archDocsPath, file));
    }
    catch (error) {
        console.warn('Error reading .arch-docs folder:', error);
        return [];
    }
}
/**
 * Parse a markdown file into structured sections
 */
export function parseMarkdownFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath, '.md');
    const lines = content.split('\n');
    const sections = [];
    let currentSection;
    let title = filename.charAt(0).toUpperCase() + filename.slice(1).replace(/-/g, ' ');
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            // Save previous section
            if (currentSection) {
                currentSection.lineEnd = index - 1;
                sections.push(currentSection);
            }
            // Extract title from first heading
            if (sections.length === 0 && headingMatch[1].length === 1) {
                title = headingMatch[2];
            }
            // Start new section
            currentSection = {
                heading: headingMatch[2],
                level: headingMatch[1].length,
                content: '',
                lineStart: index,
                lineEnd: index,
            };
        }
        else if (currentSection) {
            // Add content to current section
            currentSection.content += line + '\n';
        }
    }
    // Save last section
    if (currentSection) {
        currentSection.lineEnd = lines.length - 1;
        sections.push(currentSection);
    }
    return {
        filename,
        title,
        content,
        sections,
    };
}
/**
 * Parse all arch-docs files
 */
export function parseAllArchDocs(repoPath = process.cwd()) {
    const files = getArchDocsFiles(repoPath);
    return files.map(file => parseMarkdownFile(file));
}
/**
 * Search arch-docs by keyword (simple text search)
 */
export function searchArchDocs(docs, query, maxResults = 5) {
    const results = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    for (const doc of docs) {
        for (const section of doc.sections) {
            const sectionText = (section.heading + ' ' + section.content).toLowerCase();
            // Calculate relevance score
            let relevance = 0;
            // Exact phrase match
            if (sectionText.includes(queryLower)) {
                relevance += 10;
            }
            // Word matches
            for (const word of queryWords) {
                const matches = (sectionText.match(new RegExp(word, 'g')) || []).length;
                relevance += matches * 2;
            }
            // Heading match bonus
            if (section.heading.toLowerCase().includes(queryLower)) {
                relevance += 5;
            }
            if (relevance > 0) {
                results.push({ doc, section, relevance });
            }
        }
    }
    // Sort by relevance and return top results
    return results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, maxResults);
}
/**
 * Get specific arch-docs by filename
 */
export function getArchDocByFilename(docs, filename) {
    return docs.find(doc => doc.filename === filename);
}
/**
 * Get arch-docs summary (index.md content if available)
 */
export function getArchDocsSummary(docs) {
    const indexDoc = getArchDocByFilename(docs, 'index');
    if (indexDoc) {
        return indexDoc.content;
    }
    // Fallback: create summary from available docs
    const fileList = docs.map(doc => `- ${doc.title} (${doc.filename}.md)`).join('\n');
    return `Available Architecture Documentation:\n\n${fileList}`;
}
//# sourceMappingURL=arch-docs-parser.js.map