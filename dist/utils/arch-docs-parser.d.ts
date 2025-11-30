/**
 * Arch-Docs Parser
 * Parses .arch-docs markdown files for RAG system
 */
export interface ArchDoc {
    filename: string;
    title: string;
    content: string;
    sections: ArchDocSection[];
    metadata?: Record<string, any>;
}
export interface ArchDocSection {
    heading: string;
    level: number;
    content: string;
    lineStart: number;
    lineEnd: number;
}
/**
 * Check if .arch-docs folder exists
 */
export declare function archDocsExists(repoPath?: string): boolean;
/**
 * Get all markdown files from .arch-docs folder
 */
export declare function getArchDocsFiles(repoPath?: string): string[];
/**
 * Parse a markdown file into structured sections
 */
export declare function parseMarkdownFile(filePath: string): ArchDoc;
/**
 * Parse all arch-docs files
 */
export declare function parseAllArchDocs(repoPath?: string): ArchDoc[];
/**
 * Search arch-docs by keyword (simple text search)
 */
export declare function searchArchDocs(docs: ArchDoc[], query: string, maxResults?: number): Array<{
    doc: ArchDoc;
    section: ArchDocSection;
    relevance: number;
}>;
/**
 * Get specific arch-docs by filename
 */
export declare function getArchDocByFilename(docs: ArchDoc[], filename: string): ArchDoc | undefined;
/**
 * Get arch-docs summary (index.md content if available)
 */
export declare function getArchDocsSummary(docs: ArchDoc[]): string;
