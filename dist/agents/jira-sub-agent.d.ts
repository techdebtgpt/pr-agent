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
import { AnalysisPrompt } from '../types/agent.types.js';
/**
 * Peer Review Execution Mode
 * - EXECUTE: Execute prompts with LLM (CLI mode with API key)
 * - PROMPT_ONLY: Return prompts for calling LLM to execute (MCP mode, no API key)
 */
export declare enum PeerReviewMode {
    EXECUTE = "execute",
    PROMPT_ONLY = "prompt_only"
}
/**
 * Result when in PROMPT_ONLY mode (MCP)
 */
export interface PromptOnlyResult {
    mode: 'prompt_only';
    context: JiraSubAgentContext;
    prompts: AnalysisPrompt[];
    instructions: string;
}
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
    }, "strip", z.ZodTypeAny, {
        descriptionClarity: number;
        acceptanceCriteriaQuality: number;
        testabilityScore: number;
        scopeDefinition: number;
        technicalContext: number;
        visualDocumentation: number;
        completeness: number;
    }, {
        descriptionClarity: number;
        acceptanceCriteriaQuality: number;
        testabilityScore: number;
        scopeDefinition: number;
        technicalContext: number;
        visualDocumentation: number;
        completeness: number;
    }>;
    feedback: z.ZodObject<{
        strengths: z.ZodArray<z.ZodString, "many">;
        weaknesses: z.ZodArray<z.ZodString, "many">;
        suggestions: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        strengths: string[];
        weaknesses: string[];
        suggestions: string[];
    }, {
        strengths: string[];
        weaknesses: string[];
        suggestions: string[];
    }>;
    tier: z.ZodEnum<["excellent", "good", "adequate", "poor", "insufficient"]>;
    reviewable: z.ZodBoolean;
    reviewabilityReason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    overallScore: number;
    dimensions: {
        descriptionClarity: number;
        acceptanceCriteriaQuality: number;
        testabilityScore: number;
        scopeDefinition: number;
        technicalContext: number;
        visualDocumentation: number;
        completeness: number;
    };
    feedback: {
        strengths: string[];
        weaknesses: string[];
        suggestions: string[];
    };
    tier: "excellent" | "good" | "adequate" | "poor" | "insufficient";
    reviewable: boolean;
    reviewabilityReason: string;
}, {
    overallScore: number;
    dimensions: {
        descriptionClarity: number;
        acceptanceCriteriaQuality: number;
        testabilityScore: number;
        scopeDefinition: number;
        technicalContext: number;
        visualDocumentation: number;
        completeness: number;
    };
    feedback: {
        strengths: string[];
        weaknesses: string[];
        suggestions: string[];
    };
    tier: "excellent" | "good" | "adequate" | "poor" | "insufficient";
    reviewable: boolean;
    reviewabilityReason: string;
}>;
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
        source: z.ZodEnum<["description", "explicit_ac", "implied", "ticket_type", "technical_context"]>;
        importance: z.ZodEnum<["essential", "expected", "nice_to_have"]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        requirement: string;
        source: "description" | "explicit_ac" | "implied" | "ticket_type" | "technical_context";
        importance: "expected" | "essential" | "nice_to_have";
    }, {
        id: string;
        requirement: string;
        source: "description" | "explicit_ac" | "implied" | "ticket_type" | "technical_context";
        importance: "expected" | "essential" | "nice_to_have";
    }>, "many">;
    criteriaAnalysis: z.ZodArray<z.ZodObject<{
        criteriaId: z.ZodOptional<z.ZodString>;
        criteriaText: z.ZodString;
        status: z.ZodEnum<["met", "unmet", "partial", "unclear"]>;
        confidence: z.ZodNumber;
        evidence: z.ZodArray<z.ZodString, "many">;
        explanation: z.ZodString;
        relatedFiles: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        status: "met" | "unmet" | "partial" | "unclear";
        confidence: number;
        criteriaText: string;
        evidence: string[];
        explanation: string;
        relatedFiles: string[];
        criteriaId?: string | undefined;
    }, {
        status: "met" | "unmet" | "partial" | "unclear";
        confidence: number;
        criteriaText: string;
        evidence: string[];
        explanation: string;
        relatedFiles: string[];
        criteriaId?: string | undefined;
    }>, "many">;
    compliancePercentage: z.ZodNumber;
    gaps: z.ZodArray<z.ZodObject<{
        criteriaText: z.ZodString;
        gapDescription: z.ZodString;
        severity: z.ZodEnum<["critical", "major", "minor"]>;
        impact: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        criteriaText: string;
        gapDescription: string;
        severity: "critical" | "major" | "minor";
        impact: string;
    }, {
        criteriaText: string;
        gapDescription: string;
        severity: "critical" | "major" | "minor";
        impact: string;
    }>, "many">;
    missingBehaviors: z.ZodArray<z.ZodString, "many">;
    partialImplementations: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    derivedRequirements: {
        id: string;
        requirement: string;
        source: "description" | "explicit_ac" | "implied" | "ticket_type" | "technical_context";
        importance: "expected" | "essential" | "nice_to_have";
    }[];
    criteriaAnalysis: {
        status: "met" | "unmet" | "partial" | "unclear";
        confidence: number;
        criteriaText: string;
        evidence: string[];
        explanation: string;
        relatedFiles: string[];
        criteriaId?: string | undefined;
    }[];
    compliancePercentage: number;
    gaps: {
        criteriaText: string;
        gapDescription: string;
        severity: "critical" | "major" | "minor";
        impact: string;
    }[];
    missingBehaviors: string[];
    partialImplementations: string[];
}, {
    derivedRequirements: {
        id: string;
        requirement: string;
        source: "description" | "explicit_ac" | "implied" | "ticket_type" | "technical_context";
        importance: "expected" | "essential" | "nice_to_have";
    }[];
    criteriaAnalysis: {
        status: "met" | "unmet" | "partial" | "unclear";
        confidence: number;
        criteriaText: string;
        evidence: string[];
        explanation: string;
        relatedFiles: string[];
        criteriaId?: string | undefined;
    }[];
    compliancePercentage: number;
    gaps: {
        criteriaText: string;
        gapDescription: string;
        severity: "critical" | "major" | "minor";
        impact: string;
    }[];
    missingBehaviors: string[];
    partialImplementations: string[];
}>;
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
    }, "strip", z.ZodTypeAny, {
        issue: string;
        reason: string;
        location?: string | undefined;
    }, {
        issue: string;
        reason: string;
        location?: string | undefined;
    }>, "many">;
    warnings: z.ZodArray<z.ZodObject<{
        issue: z.ZodString;
        reason: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        issue: string;
        reason: string;
        location?: string | undefined;
    }, {
        issue: string;
        reason: string;
        location?: string | undefined;
    }>, "many">;
    recommendations: z.ZodArray<z.ZodString, "many">;
    scopeAnalysis: z.ZodObject<{
        inScope: z.ZodArray<z.ZodString, "many">;
        outOfScope: z.ZodArray<z.ZodString, "many">;
        scopeCreepRisk: z.ZodBoolean;
        scopeCreepDetails: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        inScope: string[];
        outOfScope: string[];
        scopeCreepRisk: boolean;
        scopeCreepDetails?: string | undefined;
    }, {
        inScope: string[];
        outOfScope: string[];
        scopeCreepRisk: boolean;
        scopeCreepDetails?: string | undefined;
    }>;
    regressionRisks: z.ZodArray<z.ZodObject<{
        risk: z.ZodString;
        affectedArea: z.ZodString;
        likelihood: z.ZodEnum<["high", "medium", "low"]>;
        reasoning: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        reasoning: string;
        risk: string;
        affectedArea: string;
        likelihood: "high" | "medium" | "low";
    }, {
        reasoning: string;
        risk: string;
        affectedArea: string;
        likelihood: "high" | "medium" | "low";
    }>, "many">;
    uncoveredScenarios: z.ZodArray<z.ZodObject<{
        scenario: z.ZodString;
        impact: z.ZodEnum<["critical", "major", "minor"]>;
        relatedCriteria: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        impact: "critical" | "major" | "minor";
        scenario: string;
        relatedCriteria?: string | undefined;
    }, {
        impact: "critical" | "major" | "minor";
        scenario: string;
        relatedCriteria?: string | undefined;
    }>, "many">;
    verdict: z.ZodObject<{
        summary: z.ZodString;
        recommendation: z.ZodEnum<["approve", "request_changes", "needs_discussion"]>;
        confidenceLevel: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        recommendation: "approve" | "request_changes" | "needs_discussion";
        summary: string;
        confidenceLevel: number;
    }, {
        recommendation: "approve" | "request_changes" | "needs_discussion";
        summary: string;
        confidenceLevel: number;
    }>;
}, "strip", z.ZodTypeAny, {
    recommendations: string[];
    implementationCompleteness: number;
    qualityScore: number;
    readyForReview: boolean;
    blockers: {
        issue: string;
        reason: string;
        location?: string | undefined;
    }[];
    warnings: {
        issue: string;
        reason: string;
        location?: string | undefined;
    }[];
    scopeAnalysis: {
        inScope: string[];
        outOfScope: string[];
        scopeCreepRisk: boolean;
        scopeCreepDetails?: string | undefined;
    };
    regressionRisks: {
        reasoning: string;
        risk: string;
        affectedArea: string;
        likelihood: "high" | "medium" | "low";
    }[];
    uncoveredScenarios: {
        impact: "critical" | "major" | "minor";
        scenario: string;
        relatedCriteria?: string | undefined;
    }[];
    verdict: {
        recommendation: "approve" | "request_changes" | "needs_discussion";
        summary: string;
        confidenceLevel: number;
    };
}, {
    recommendations: string[];
    implementationCompleteness: number;
    qualityScore: number;
    readyForReview: boolean;
    blockers: {
        issue: string;
        reason: string;
        location?: string | undefined;
    }[];
    warnings: {
        issue: string;
        reason: string;
        location?: string | undefined;
    }[];
    scopeAnalysis: {
        inScope: string[];
        outOfScope: string[];
        scopeCreepRisk: boolean;
        scopeCreepDetails?: string | undefined;
    };
    regressionRisks: {
        reasoning: string;
        risk: string;
        affectedArea: string;
        likelihood: "high" | "medium" | "low";
    }[];
    uncoveredScenarios: {
        impact: "critical" | "major" | "minor";
        scenario: string;
        relatedCriteria?: string | undefined;
    }[];
    verdict: {
        recommendation: "approve" | "request_changes" | "needs_discussion";
        summary: string;
        confidenceLevel: number;
    };
}>;
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
    private mode;
    private llm?;
    constructor(mode?: PeerReviewMode, llm?: BaseLanguageModel);
    /**
     * Analyze a ticket and PR, providing comprehensive peer review
     * Returns either executed results (EXECUTE mode) or prompts (PROMPT_ONLY mode)
     */
    analyze(context: JiraSubAgentContext): Promise<JiraSubAgentResult | PromptOnlyResult>;
    /**
     * Build prompts without executing (MCP mode)
     */
    private buildPrompts;
    /**
     * Execute analysis with LLM (CLI mode)
     */
    private executeAnalysis;
    /**
     * Build ticket quality prompt (PROMPT_ONLY mode)
     */
    private buildTicketQualityPrompt;
    /**
     * Build AC validation prompt (PROMPT_ONLY mode)
     */
    private buildACValidationPrompt;
    /**
     * Build peer review prompt (PROMPT_ONLY mode)
     */
    private buildPeerReviewPrompt;
    /**
     * Rate the quality of a Jira ticket (EXECUTE mode)
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
