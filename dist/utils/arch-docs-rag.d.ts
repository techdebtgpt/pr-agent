/**
 * Arch-Docs RAG System
 * Retrieval Augmented Generation for architecture documentation
 */
import { ArchDoc } from './arch-docs-parser.js';
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
export declare function buildArchDocsContext(docs: ArchDoc[], prContext: {
    title?: string;
    files: Array<{
        path: string;
        diff?: string;
    }>;
    diff?: string;
}): ArchDocsContext;
/**
 * Format arch-docs context for inclusion in prompts
 */
export declare function formatArchDocsForPrompt(context: ArchDocsContext): string;
/**
 * Get specific context for risk analysis
 */
export declare function getSecurityContext(docs: ArchDoc[]): string;
/**
 * Get specific context for architecture understanding
 */
export declare function getArchitectureContext(docs: ArchDoc[]): string;
/**
 * Get specific context for patterns
 */
export declare function getPatternsContext(docs: ArchDoc[]): string;
