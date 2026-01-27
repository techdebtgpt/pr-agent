/**
 * Ticket Extractor Service
 * Extracts ticket references from PR metadata
 * Single Responsibility: Ticket identification and extraction
 */
// Default Jira ticket pattern: PROJ-123
const DEFAULT_TICKET_PATTERN = /([A-Z][A-Z0-9]+-\d+)/g;
export class TicketExtractorService {
    /**
     * Extract ticket references from all PR metadata sources
     */
    static extractTicketReferences(title, branchName, commitMessages, defaultProject) {
        const references = new Map();
        // Extract from title (highest confidence - 95%)
        if (title) {
            this.extractFromText(title, 'title', 95, references, defaultProject);
        }
        // Extract from branch name (high confidence - 90%)
        this.extractFromText(branchName, 'branch', 90, references, defaultProject);
        // Extract from commit messages (lower confidence - 70%)
        for (const message of commitMessages) {
            this.extractFromText(message, 'commit', 70, references, defaultProject);
        }
        // Sort by confidence (highest first)
        return Array.from(references.values()).sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Extract ticket keys from text using pattern matching
     */
    static extractFromText(text, source, baseConfidence, references, defaultProject) {
        // Reset regex state
        DEFAULT_TICKET_PATTERN.lastIndex = 0;
        let match;
        while ((match = DEFAULT_TICKET_PATTERN.exec(text)) !== null) {
            const key = match[1].toUpperCase();
            // If default project is set, only include tickets from that project
            if (defaultProject && !key.startsWith(defaultProject)) {
                continue;
            }
            // Skip if we already have this reference with higher confidence
            const existing = references.get(key);
            if (existing && existing.confidence >= baseConfidence) {
                continue;
            }
            references.set(key, {
                key,
                source,
                confidence: baseConfidence,
            });
        }
    }
    /**
     * Get the primary (highest confidence) ticket reference
     */
    static getPrimaryTicket(references) {
        return references.length > 0 ? references[0] : undefined;
    }
    /**
     * Check if any tickets were found
     */
    static hasTickets(references) {
        return references.length > 0;
    }
    /**
     * Filter tickets by minimum confidence threshold
     */
    static filterByConfidence(references, minConfidence) {
        return references.filter((ref) => ref.confidence >= minConfidence);
    }
}
//# sourceMappingURL=ticket-extractor.service.js.map