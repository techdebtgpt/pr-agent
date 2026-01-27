/**
 * Diff Parser Service
 * Parses git diff output into structured file metadata
 * Single Responsibility: Diff parsing and file extraction
 */
import type { DiffFileMetadata } from '../types.js';
export declare class DiffParserService {
    /**
     * Parse diff string into file metadata
     * Extracts file paths, additions, deletions, and status
     */
    static parseDiffFiles(diff: string): DiffFileMetadata[];
    /**
     * Calculate total additions from diff files
     */
    static getTotalAdditions(files: DiffFileMetadata[]): number;
    /**
     * Calculate total deletions from diff files
     */
    static getTotalDeletions(files: DiffFileMetadata[]): number;
    /**
     * Get unique languages from file paths
     */
    static getLanguagesFromFiles(files: DiffFileMetadata[]): string[];
}
