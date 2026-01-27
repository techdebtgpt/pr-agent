/**
 * Ticket Extractor Service
 * Extracts ticket references from PR metadata
 * Single Responsibility: Ticket identification and extraction
 */
import type { TicketReference } from '../types.js';
export declare class TicketExtractorService {
    /**
     * Extract ticket references from all PR metadata sources
     */
    static extractTicketReferences(title: string | undefined, branchName: string, commitMessages: string[], defaultProject?: string): TicketReference[];
    /**
     * Extract ticket keys from text using pattern matching
     */
    private static extractFromText;
    /**
     * Get the primary (highest confidence) ticket reference
     */
    static getPrimaryTicket(references: TicketReference[]): TicketReference | undefined;
    /**
     * Check if any tickets were found
     */
    static hasTickets(references: TicketReference[]): boolean;
    /**
     * Filter tickets by minimum confidence threshold
     */
    static filterByConfidence(references: TicketReference[], minConfidence: number): TicketReference[];
}
