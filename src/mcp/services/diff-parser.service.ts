/**
 * Diff Parser Service
 * Parses git diff output into structured file metadata
 * Single Responsibility: Diff parsing and file extraction
 */

import type { DiffFileMetadata } from '../types.js';
import { GIT_PATTERNS } from '../constants.js';

export class DiffParserService {
  /**
   * Parse diff string into file metadata
   * Extracts file paths, additions, deletions, and status
   */
  static parseDiffFiles(diff: string): DiffFileMetadata[] {
    const files: DiffFileMetadata[] = [];
    const filePattern = new RegExp(GIT_PATTERNS.FILE_DIFF_HEADER);
    let match;

    while ((match = filePattern.exec(diff)) !== null) {
      const filePath = match[2] !== '/dev/null' ? match[2] : match[1];
      const isNew = match[1] === '/dev/null' || match[1].startsWith('dev/null');
      const isDeleted = match[2] === '/dev/null';

      // Count additions and deletions for this file
      const fileStart = match.index;
      const nextFileMatch = filePattern.exec(diff);
      const fileEnd = nextFileMatch ? nextFileMatch.index : diff.length;
      filePattern.lastIndex = match.index + 1; // Reset to continue from after current match

      const fileContent = diff.substring(fileStart, fileEnd);
      const additions = (fileContent.match(/^\+[^+]/gm) || []).length;
      const deletions = (fileContent.match(/^-[^-]/gm) || []).length;

      files.push({
        path: filePath,
        additions,
        deletions,
        status: isNew ? 'added' : isDeleted ? 'deleted' : 'modified',
      });
    }

    return files;
  }

  /**
   * Calculate total additions from diff files
   */
  static getTotalAdditions(files: DiffFileMetadata[]): number {
    return files.reduce((sum, f) => sum + (f.additions || 0), 0);
  }

  /**
   * Calculate total deletions from diff files
   */
  static getTotalDeletions(files: DiffFileMetadata[]): number {
    return files.reduce((sum, f) => sum + (f.deletions || 0), 0);
  }

  /**
   * Get unique languages from file paths
   */
  static getLanguagesFromFiles(files: DiffFileMetadata[]): string[] {
    const extensions = new Set<string>();

    for (const file of files) {
      const ext = file.path.split('.').pop()?.toLowerCase();
      if (ext) {
        extensions.add(ext);
      }
    }

    return Array.from(extensions);
  }
}
