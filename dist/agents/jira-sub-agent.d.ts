/**
 * Jira Sub-Agent (Peer Review Agent)
 *
 * This agent acts like an experienced senior developer reviewing a PR.
 * It understands not just the code, but the business context from the Jira ticket.
 *
 * KEY PHILOSOPHY:
 * Like a senior developer who deeply knows the codebase, this agent:
 * 1. Mentally constructs test scenarios and edge cases (INTERNAL reasoning)
 * 2. Uses those mental models to EVALUATE if the implementation is complete
 * 3. Checks if changes might break other parts of the application
 * 4. Reports FINDINGS, not suggestions for tests
 *
 * The test scenarios are the agent's internal thought process - like how a
 * senior dev thinks "what about when X happens?" while reviewing code.
 * The OUTPUT is the conclusion: "This doesn't handle X" or "X case is covered".
 */
import { z } from 'zod';
import { IssueTicket } from '../types/issue-tracker.types.js';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
declare const TicketQualitySchema: z.ZodObject<{
    overallScore: z.ZodNumber;
    dimensions: z.ZodObject<{
        descriptionClarity: z.ZodNumber;
        acceptanceCriteriaQuality: z.ZodNumber;
        testabilityScore: z.ZodNumber;
        scopeDefinition: z.ZodNumber;
        technicalContext: z.ZodNumber;
        visualDocumentation: z.ZodNumber;
        completeness: z.ZodNumber;
    }, z.core.$strip>;
    feedback: z.ZodObject<{
        strengths: z.ZodArray<z.ZodString>;
        weaknesses: z.ZodArray<z.ZodString>;
        suggestions: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
    tier: z.ZodEnum<{
        excellent: "excellent";
        good: "good";
        adequate: "adequate";
        poor: "poor";
        insufficient: "insufficient";
    }>;
    reviewable: z.ZodBoolean;
    reviewabilityReason: z.ZodString;
}, z.core.$strip>;
/**
 * Acceptance Criteria Validation - focuses on what IS and ISN'T covered
 *
 * IMPORTANT: The agent DERIVES its own acceptance criteria by analyzing:
 * - The full ticket description
 * - Any explicit AC field (if present, but don't rely on it)
 * - The ticket type (bug vs feature has different expectations)
 * - Technical context and constraints mentioned
 *
 * Like a senior dev who reads the whole ticket and thinks:
 * "To implement this properly, I'd need to: 1) do X, 2) handle Y, 3) ensure Z"
 */
declare const AcceptanceCriteriaValidationSchema: z.ZodObject<{
    derivedRequirements: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        requirement: z.ZodString;
        source: z.ZodEnum<{
            description: "description";
            explicit_ac: "explicit_ac";
            implied: "implied";
            ticket_type: "ticket_type";
            technical_context: "technical_context";
        }>;
        importance: z.ZodEnum<{
            expected: "expected";
            essential: "essential";
            nice_to_have: "nice_to_have";
        }>;
    }, z.core.$strip>>;
    criteriaAnalysis: z.ZodArray<z.ZodObject<{
        criteriaId: z.ZodOptional<z.ZodString>;
        criteriaText: z.ZodString;
        status: z.ZodEnum<{
            met: "met";
            unmet: "unmet";
            partial: "partial";
            unclear: "unclear";
        }>;
        confidence: z.ZodNumber;
        evidence: z.ZodArray<z.ZodString>;
        explanation: z.ZodString;
        relatedFiles: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
    compliancePercentage: z.ZodNumber;
    gaps: z.ZodArray<z.ZodObject<{
        criteriaText: z.ZodString;
        gapDescription: z.ZodString;
        severity: z.ZodEnum<{
            critical: "critical";
            major: "major";
            minor: "minor";
        }>;
        impact: z.ZodString;
    }, z.core.$strip>>;
    missingBehaviors: z.ZodArray<z.ZodString>;
    partialImplementations: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
/**
 * Peer Review Analysis - the senior developer's verdict
 */
declare const PeerReviewAnalysisSchema: z.ZodObject<{
    implementationCompleteness: z.ZodNumber;
    qualityScore: z.ZodNumber;
    readyForReview: z.ZodBoolean;
    blockers: z.ZodArray<z.ZodObject<{
        issue: z.ZodString;
        reason: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    warnings: z.ZodArray<z.ZodObject<{
        issue: z.ZodString;
        reason: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    recommendations: z.ZodArray<z.ZodString>;
    scopeAnalysis: z.ZodObject<{
        inScope: z.ZodArray<z.ZodString>;
        outOfScope: z.ZodArray<z.ZodString>;
        scopeCreepRisk: z.ZodBoolean;
        scopeCreepDetails: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    regressionRisks: z.ZodArray<z.ZodObject<{
        risk: z.ZodString;
        affectedArea: z.ZodString;
        likelihood: z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        reasoning: z.ZodString;
    }, z.core.$strip>>;
    uncoveredScenarios: z.ZodArray<z.ZodObject<{
        scenario: z.ZodString;
        impact: z.ZodEnum<{
            critical: "critical";
            major: "major";
            minor: "minor";
        }>;
        relatedCriteria: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    verdict: z.ZodObject<{
        summary: z.ZodString;
        recommendation: z.ZodEnum<{
            approve: "approve";
            request_changes: "request_changes";
            needs_discussion: "needs_discussion";
        }>;
        confidenceLevel: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type TicketQualityRating = z.infer<typeof TicketQualitySchema>;
export type AcceptanceCriteriaValidation = z.infer<typeof AcceptanceCriteriaValidationSchema>;
export type PeerReviewAnalysis = z.infer<typeof PeerReviewAnalysisSchema>;
export interface JiraSubAgentResult {
    ticketQuality: TicketQualityRating;
    acValidation?: AcceptanceCriteriaValidation;
    peerReview: PeerReviewAnalysis;
}
export interface JiraSubAgentContext {
    ticket: IssueTicket;
    prTitle: string;
    prDescription?: string;
    diff: string;
    files: Array<{
        path: string;
        additions: number;
        deletions: number;
        status: string;
    }>;
    prSummary?: string;
    prRisks?: string[];
}
export declare class JiraSubAgent {
    private llm;
    constructor(llm: BaseLanguageModel);
    /**
     * Analyze a ticket and PR, providing comprehensive peer review
     */
    analyze(context: JiraSubAgentContext): Promise<JiraSubAgentResult>;
    /**
     * Rate the quality of a Jira ticket
     */
    rateTicketQuality(ticket: IssueTicket): Promise<TicketQualityRating>;
    /**
     * Validate acceptance criteria against PR changes
     */
    validateAcceptanceCriteria(context: JiraSubAgentContext): Promise<AcceptanceCriteriaValidation>;
    /**
     * Generate comprehensive peer review analysis
     */
    generatePeerReview(context: JiraSubAgentContext, ticketQuality: TicketQualityRating, acValidation?: AcceptanceCriteriaValidation): Promise<PeerReviewAnalysis>;
}
export {};
