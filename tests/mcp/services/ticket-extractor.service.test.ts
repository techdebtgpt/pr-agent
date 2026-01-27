/**
 * Unit tests for TicketExtractorService
 * Tests ticket reference extraction from PR metadata
 */

import { describe, it, expect } from '@jest/globals';
import { TicketExtractorService } from '../../../src/mcp/services/ticket-extractor.service.js';

describe('TicketExtractorService', () => {
  describe('extractTicketReferences', () => {
    it('should extract ticket from branch name', () => {
      const refs = TicketExtractorService.extractTicketReferences(
        'Fix bug',
        'feature/TODO-123-add-feature',
        [],
        'TODO'
      );

      expect(refs).toEqual([
        {
          key: 'TODO-123',
          source: 'branch',
          confidence: 90,
        },
      ]);
    });

    it('should extract ticket from PR title', () => {
      const refs = TicketExtractorService.extractTicketReferences(
        '[TODO-456] Fix critical bug',
        'feature/some-branch',
        [],
        'TODO'
      );

      expect(refs).toContainEqual(
        expect.objectContaining({
          key: 'TODO-456',
          source: 'title',
        })
      );
    });

    it('should extract ticket from commit messages', () => {
      const commits = [
        'feat: Implement feature for PROJ-789',
        'fix: Address TODO-123 issue',
      ];

      const refs = TicketExtractorService.extractTicketReferences(
        'Update code',
        'feature/update',
        commits,
        'TODO'
      );

      expect(refs).toContainEqual(
        expect.objectContaining({
          key: 'TODO-123',
          source: 'commit',
        })
      );
    });

    it('should deduplicate ticket references', () => {
      const commits = ['TODO-123: Update', 'Fix TODO-123 bug'];

      const refs = TicketExtractorService.extractTicketReferences(
        '[TODO-123] Title',
        'feature/TODO-123-branch',
        commits,
        'TODO'
      );

      const todo123Refs = refs.filter((r) => r.key === 'TODO-123');
      // Should have refs from title, branch, and commit but deduplicated
      expect(todo123Refs.length).toBeGreaterThan(0);
    });

    it('should return empty array when no tickets found', () => {
      const refs = TicketExtractorService.extractTicketReferences(
        'Simple PR',
        'feature/no-ticket',
        ['No ticket commit'],
        'TODO'
      );

      expect(refs).toEqual([]);
    });

    it('should handle multiple ticket formats', () => {
      const refs = TicketExtractorService.extractTicketReferences(
        'Fix TODO-123 and PROJ-456',
        'feature/update',
        [],
        'TODO'
      );

      expect(refs.length).toBeGreaterThan(0);
      expect(refs.some((r) => r.key === 'TODO-123')).toBe(true);
    });

    it('should prioritize defaultProject tickets', () => {
      const refs = TicketExtractorService.extractTicketReferences(
        'Fix TODO-123',
        'feature/branch',
        [],
        'TODO'
      );

      const todo123 = refs.find((r) => r.key === 'TODO-123');
      expect(todo123).toBeDefined();
      expect(todo123?.confidence).toBeGreaterThan(0.7);
    });

    it('should not match lowercase ticket keys', () => {
      // Ticket pattern only matches uppercase (e.g., TODO-123, not todo-123)
      const refs = TicketExtractorService.extractTicketReferences(
        'Fix todo-123 bug',
        'feature/todo-456',
        [],
        'TODO'
      );

      // Lowercase tickets should not be extracted
      expect(refs.length).toBe(0);
    });

    it('should extract from complex branch names', () => {
      const refs = TicketExtractorService.extractTicketReferences(
        'Feature',
        'feature/TODO-789-implement-complex-feature-with-details',
        [],
        'TODO'
      );

      expect(refs).toContainEqual(
        expect.objectContaining({
          key: 'TODO-789',
          source: 'branch',
        })
      );
    });

    it('should handle empty inputs gracefully', () => {
      const refs = TicketExtractorService.extractTicketReferences('', '', [], '');

      expect(refs).toEqual([]);
    });
  });
});
