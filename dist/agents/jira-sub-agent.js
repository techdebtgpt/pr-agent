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
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
// ========== Execution Modes ==========
/**
 * Peer Review Execution Mode
 * - EXECUTE: Execute prompts with LLM (CLI mode with API key)
 * - PROMPT_ONLY: Return prompts for calling LLM to execute (MCP mode, no API key)
 */
export var PeerReviewMode;
(function (PeerReviewMode) {
    PeerReviewMode["EXECUTE"] = "execute";
    PeerReviewMode["PROMPT_ONLY"] = "prompt_only";
})(PeerReviewMode || (PeerReviewMode = {}));
// ========== Output Schemas ==========
const TicketQualitySchema = z.object({
    overallScore: z.number().min(0).max(100).describe('Overall ticket quality score'),
    dimensions: z.object({
        descriptionClarity: z.number().min(0).max(100),
        acceptanceCriteriaQuality: z.number().min(0).max(100),
        testabilityScore: z.number().min(0).max(100),
        scopeDefinition: z.number().min(0).max(100),
        technicalContext: z.number().min(0).max(100),
        visualDocumentation: z.number().min(0).max(100),
        completeness: z.number().min(0).max(100),
    }),
    feedback: z.object({
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        suggestions: z.array(z.string()),
    }),
    tier: z.enum(['excellent', 'good', 'adequate', 'poor', 'insufficient']),
    reviewable: z.boolean(),
    reviewabilityReason: z.string(),
});
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
const AcceptanceCriteriaValidationSchema = z.object({
    // The agent's derived understanding of what needs to be implemented
    derivedRequirements: z.array(z.object({
        id: z.string(),
        requirement: z.string().describe('What the agent derived needs to be done'),
        source: z.enum(['description', 'explicit_ac', 'implied', 'ticket_type', 'technical_context'])
            .describe('Where this requirement was derived from'),
        importance: z.enum(['essential', 'expected', 'nice_to_have']),
    })).describe('Requirements derived by analyzing the full ticket, not just AC field'),
    // Analysis of each derived requirement against the PR
    criteriaAnalysis: z.array(z.object({
        criteriaId: z.string().optional(),
        criteriaText: z.string(),
        status: z.enum(['met', 'unmet', 'partial', 'unclear']),
        confidence: z.number().min(0).max(100),
        evidence: z.array(z.string()).describe('Code evidence showing coverage or lack thereof'),
        explanation: z.string().describe('Why this criteria is/isnt met'),
        relatedFiles: z.array(z.string()),
    })),
    compliancePercentage: z.number().min(0).max(100),
    gaps: z.array(z.object({
        criteriaText: z.string(),
        gapDescription: z.string().describe('What specific functionality is missing'),
        severity: z.enum(['critical', 'major', 'minor']),
        impact: z.string().describe('What will happen if this gap is not addressed'),
    })),
    // Internal reasoning exposed as findings, not suggestions
    missingBehaviors: z.array(z.string()).describe('Behaviors that should exist but dont'),
    partialImplementations: z.array(z.string()).describe('Features that are started but incomplete'),
});
/**
 * Peer Review Analysis - the senior developer's verdict
 */
const PeerReviewAnalysisSchema = z.object({
    implementationCompleteness: z.number().min(0).max(100),
    qualityScore: z.number().min(0).max(100),
    readyForReview: z.boolean(),
    // Critical findings that block merge
    blockers: z.array(z.object({
        issue: z.string(),
        reason: z.string(),
        location: z.string().optional().describe('File or component affected'),
    })),
    // Important issues that should be fixed
    warnings: z.array(z.object({
        issue: z.string(),
        reason: z.string(),
        location: z.string().optional(),
    })),
    // Nice-to-have improvements
    recommendations: z.array(z.string()),
    // Scope analysis
    scopeAnalysis: z.object({
        inScope: z.array(z.string()),
        outOfScope: z.array(z.string()),
        scopeCreepRisk: z.boolean(),
        scopeCreepDetails: z.string().optional(),
    }),
    // Potential regression analysis - what might break
    regressionRisks: z.array(z.object({
        risk: z.string().describe('What could break'),
        affectedArea: z.string().describe('Part of the app that might be affected'),
        likelihood: z.enum(['high', 'medium', 'low']),
        reasoning: z.string().describe('Why this might happen'),
    })),
    // Uncovered scenarios identified during review (findings, not suggestions)
    uncoveredScenarios: z.array(z.object({
        scenario: z.string().describe('A scenario that isnt handled'),
        impact: z.enum(['critical', 'major', 'minor']),
        relatedCriteria: z.string().optional(),
    })),
    // Final verdict
    verdict: z.object({
        summary: z.string().describe('One paragraph summary of the review'),
        recommendation: z.enum(['approve', 'request_changes', 'needs_discussion']),
        confidenceLevel: z.number().min(0).max(100),
    }),
});
// ========== Prompts ==========
const TICKET_QUALITY_PROMPT = `You are an expert at evaluating Jira tickets and user stories.
Analyze the following ticket and rate its quality based on industry best practices.

TICKET INFORMATION:
Key: {ticketKey}
Type: {ticketType}
Title: {ticketTitle}
Description:
{ticketDescription}

Acceptance Criteria:
{acceptanceCriteria}

Test Scenarios Defined: {testScenarios}
Has Screenshots/Mockups: {hasScreenshots}
Has Diagrams: {hasDiagrams}
Story Points: {storyPoints}
Labels: {labels}
Components: {components}

EVALUATION CRITERIA:
1. Description Clarity (0-100): Is the description clear, complete, and unambiguous?
2. Acceptance Criteria Quality (0-100): Are ACs specific, measurable, achievable, and testable (SMART)?
3. Testability Score (0-100): Can this ticket be tested? Are expected behaviors clear?
4. Scope Definition (0-100): Is the scope well-defined and bounded? No scope creep potential?
5. Technical Context (0-100): Are technical requirements, constraints, and dependencies clear?
6. Visual Documentation (0-100): Are there screenshots, mockups, or diagrams where needed?
7. Completeness (0-100): Overall ticket completeness - nothing critical missing?

QUALITY TIERS:
- excellent (85-100): Exemplary ticket, can be implemented with high confidence
- good (70-84): Well-written ticket with minor gaps
- adequate (50-69): Passable but has notable gaps that may cause issues
- poor (25-49): Significant issues, needs improvement before implementation
- insufficient (0-24): Cannot be implemented reliably, needs major rework

REVIEWABILITY:
A ticket is "reviewable" if there's enough information to meaningfully derive what needs
to be implemented. This does NOT require an explicit acceptance criteria field!

A ticket is REVIEWABLE if:
- The description explains what needs to be done (even briefly)
- The title + type give enough context to understand the goal
- A senior developer could reasonably derive requirements from it

A ticket is NOT REVIEWABLE if:
- It's just a title with no description (e.g., "Fix bug" with nothing else)
- It's too vague to derive any concrete requirements
- There's literally not enough info to know what "done" looks like

Remember: Many good tickets have detailed descriptions but empty AC fields.
The key is whether YOU can derive what needs to be built.

{format_instructions}`;
const AC_VALIDATION_PROMPT = `You are a SENIOR DEVELOPER with deep knowledge of this codebase reviewing a PR.

Your task: Understand what this ticket requires, then evaluate if the PR implements it correctly.

CRITICAL: DO NOT just rely on the "Acceptance Criteria" field. Many tickets have empty AC or
poorly written AC. You must DERIVE your own understanding of what needs to be done by reading:
- The full description
- The ticket type (bug fix has different needs than a feature)
- Any technical context mentioned
- The implicit requirements (what any experienced dev would know is needed)

Think like an experienced dev who reads a ticket and thinks:
"Okay, to implement this properly I need to: handle X, add Y, make sure Z works..."

JIRA TICKET:
Key: {ticketKey}
Type: {ticketType}
Title: {ticketTitle}

FULL DESCRIPTION (analyze this carefully):
{ticketDescription}

EXPLICIT ACCEPTANCE CRITERIA (may be empty or incomplete - don't rely solely on this):
{acceptanceCriteria}

PR INFORMATION:
Title: {prTitle}
Description: {prDescription}

FILES CHANGED:
{filesChanged}

CODE DIFF:
{diff}

PREVIOUS PR ANALYSIS SUMMARY:
{prSummary}

YOUR TASK:

1. DERIVE REQUIREMENTS:
   First, read the entire ticket and derive what actually needs to be implemented.
   For each requirement you identify, note:
   - What the requirement is
   - Where you derived it from (description, explicit AC, implied by ticket type, technical context)
   - How essential it is (essential, expected, nice-to-have)

   Don't just copy the AC field - THINK about what's really needed.
   A ticket saying "Add login button" implies: the button should be visible, clickable,
   trigger auth flow, handle errors, etc.

2. VALIDATE EACH REQUIREMENT:
   For each derived requirement:
   - Is it MET, UNMET, PARTIAL, or UNCLEAR in the code?
   - Provide CODE EVIDENCE
   - Explain your reasoning

3. IDENTIFY GAPS:
   What's missing? What behaviors should exist but don't?
   Think through scenarios: "What if the user does X?" "What about error case Y?"

Report FINDINGS, not suggestions. Like a senior dev saying:
"This doesn't handle the case when the user is logged out"

{format_instructions}`;
const PEER_REVIEW_PROMPT = `You are a SENIOR DEVELOPER doing a thorough peer review.

You've been with this team for years. You know where the bodies are buried.
You think about:
- Does this actually solve the problem in the ticket?
- What might this break in other parts of the app?
- Are there scenarios the developer didn't consider?
- Is this ready for production?

JIRA TICKET:
Key: {ticketKey}
Type: {ticketType}
Title: {ticketTitle}
Description: {ticketDescription}
Acceptance Criteria: {acceptanceCriteria}

PR INFORMATION:
Title: {prTitle}
Description: {prDescription}

FILES CHANGED:
{filesChanged}

DIFF SUMMARY:
{diff}

EXISTING PR ANALYSIS:
Summary: {prSummary}
Risks Identified: {prRisks}

TICKET QUALITY ASSESSMENT:
Overall Score: {ticketQualityScore}/100
Reviewable: {isReviewable}

AC VALIDATION RESULTS:
Compliance: {acCompliancePercentage}%
Gaps Found: {gapsFound}

YOUR PEER REVIEW TASK:

1. IMPLEMENTATION COMPLETENESS (0-100):
   Does this PR fully implement what the ticket asks for?

2. QUALITY SCORE (0-100):
   Code quality + requirements adherence combined

3. READY FOR REVIEW:
   Would you approve this or request changes?

4. BLOCKERS:
   Critical issues - things that MUST be fixed before merge
   (missing functionality, bugs, security issues)

5. WARNINGS:
   Important issues - things that SHOULD be fixed
   (edge cases not handled, potential bugs)

6. RECOMMENDATIONS:
   Nice-to-haves for improvement

7. SCOPE ANALYSIS:
   - What's in scope vs out of scope?
   - Is there scope creep?

8. REGRESSION RISKS:
   Think: "What else in the app might this break?"
   - Consider dependencies, shared code, side effects
   - Think about how this interacts with existing features

9. UNCOVERED SCENARIOS:
   As a senior dev, you mentally run through scenarios:
   - "What if the user does X?"
   - "What about when Y is null?"
   - "What happens during Z error condition?"

   Report which scenarios you identified that AREN'T handled.
   Don't suggest tests - just flag what's missing.

10. FINAL VERDICT:
    Give your honest assessment:
    - APPROVE: Ready to merge (maybe minor nits)
    - REQUEST_CHANGES: Needs work before merge
    - NEEDS_DISCUSSION: Architectural concerns to discuss

{format_instructions}`;
// ========== Agent Class ==========
export class JiraSubAgent {
    mode;
    llm;
    constructor(mode = PeerReviewMode.EXECUTE, llm) {
        this.mode = mode;
        this.llm = llm;
        // Validate: EXECUTE mode requires LLM
        if (mode === PeerReviewMode.EXECUTE && !llm) {
            throw new Error('JiraSubAgent: LLM is required when mode is EXECUTE');
        }
    }
    /**
     * Analyze a ticket and PR, providing comprehensive peer review
     * Returns either executed results (EXECUTE mode) or prompts (PROMPT_ONLY mode)
     */
    async analyze(context) {
        if (this.mode === PeerReviewMode.PROMPT_ONLY) {
            return this.buildPrompts(context);
        }
        else {
            return this.executeAnalysis(context);
        }
    }
    /**
     * Build prompts without executing (MCP mode)
     */
    buildPrompts(context) {
        const prompts = [];
        // Step 1: Build ticket quality prompt
        prompts.push(this.buildTicketQualityPrompt(context.ticket));
        // Step 2: Build AC validation prompt (always - agent derives requirements)
        prompts.push(this.buildACValidationPrompt(context));
        // Step 3: Build peer review prompt
        // Note: In PROMPT_ONLY mode, we don't know ticketQuality yet,
        // so we include it as a dependency instruction
        prompts.push(this.buildPeerReviewPrompt(context));
        return {
            mode: 'prompt_only',
            context,
            prompts,
            instructions: 'Execute these prompts sequentially. ' +
                'Pass the output of ticketQuality to peerReview as ticketQualityScore. ' +
                'Parse each response according to the provided schema.'
        };
    }
    /**
     * Execute analysis with LLM (CLI mode)
     */
    async executeAnalysis(context) {
        // Step 1: Rate ticket quality
        const ticketQuality = await this.rateTicketQuality(context.ticket);
        // Step 2: Derive requirements and validate against PR
        // NOTE: We analyze even if there's no explicit AC field - the agent derives
        // requirements from the full ticket (description, title, type, context)
        let acValidation;
        if (ticketQuality.reviewable) {
            // The agent will derive its own requirements from the ticket
            // Don't skip just because acceptanceCriteriaList is empty
            acValidation = await this.validateAcceptanceCriteria(context);
        }
        // Step 3: Generate peer review analysis
        const peerReview = await this.generatePeerReview(context, ticketQuality, acValidation);
        return {
            ticketQuality,
            acValidation,
            peerReview,
        };
    }
    /**
     * Build ticket quality prompt (PROMPT_ONLY mode)
     */
    buildTicketQualityPrompt(ticket) {
        const parser = StructuredOutputParser.fromZodSchema(TicketQualitySchema);
        const inputs = {
            ticketKey: ticket.key,
            ticketType: ticket.type,
            ticketTitle: ticket.title,
            ticketDescription: ticket.description || 'No description provided',
            acceptanceCriteria: ticket.acceptanceCriteria ||
                ticket.acceptanceCriteriaList?.join('\n') ||
                'No acceptance criteria defined',
            testScenarios: ticket.testScenarios?.join(', ') || 'None defined',
            hasScreenshots: ticket.hasScreenshots ? 'Yes' : 'No',
            hasDiagrams: ticket.hasDiagrams ? 'Yes' : 'No',
            storyPoints: ticket.storyPoints?.toString() || 'Not estimated',
            labels: ticket.labels.join(', ') || 'None',
            components: ticket.components.join(', ') || 'None',
            format_instructions: parser.getFormatInstructions(),
        };
        // Fill in the template
        let prompt = TICKET_QUALITY_PROMPT;
        for (const [key, value] of Object.entries(inputs)) {
            prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        }
        return {
            step: 'ticketQuality',
            prompt,
            schema: TicketQualitySchema,
            formatInstructions: parser.getFormatInstructions(),
            inputs,
            instructions: 'Analyze the ticket quality and return a JSON object matching the schema',
        };
    }
    /**
     * Build AC validation prompt (PROMPT_ONLY mode)
     */
    buildACValidationPrompt(context) {
        const parser = StructuredOutputParser.fromZodSchema(AcceptanceCriteriaValidationSchema);
        // Format acceptance criteria with IDs
        const acList = context.ticket.acceptanceCriteriaList || [];
        const formattedAC = acList
            .map((ac, i) => `AC-${i + 1}: ${ac}`)
            .join('\n');
        // Format files changed
        const filesChanged = context.files
            .map((f) => `${f.path} (+${f.additions}/-${f.deletions}) [${f.status}]`)
            .join('\n');
        // Truncate diff if too long
        const maxDiffLength = 15000;
        const truncatedDiff = context.diff.length > maxDiffLength
            ? context.diff.substring(0, maxDiffLength) + '\n... [diff truncated]'
            : context.diff;
        const inputs = {
            ticketKey: context.ticket.key,
            ticketType: context.ticket.type,
            ticketTitle: context.ticket.title,
            ticketDescription: context.ticket.description?.substring(0, 2000) || 'No description',
            acceptanceCriteria: formattedAC || 'No acceptance criteria defined',
            prTitle: context.prTitle,
            prDescription: context.prDescription || 'No description',
            filesChanged,
            diff: truncatedDiff,
            prSummary: context.prSummary || 'No summary available',
            format_instructions: parser.getFormatInstructions(),
        };
        // Fill in the template
        let prompt = AC_VALIDATION_PROMPT;
        for (const [key, value] of Object.entries(inputs)) {
            prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        }
        return {
            step: 'acValidation',
            prompt,
            schema: AcceptanceCriteriaValidationSchema,
            formatInstructions: parser.getFormatInstructions(),
            inputs,
            instructions: 'Validate acceptance criteria coverage and return a JSON object matching the schema',
        };
    }
    /**
     * Build peer review prompt (PROMPT_ONLY mode)
     */
    buildPeerReviewPrompt(context) {
        const parser = StructuredOutputParser.fromZodSchema(PeerReviewAnalysisSchema);
        // Format files changed
        const filesChanged = context.files
            .map((f) => `${f.path} (+${f.additions}/-${f.deletions}) [${f.status}]`)
            .join('\n');
        // Truncate diff if too long
        const maxDiffLength = 10000;
        const truncatedDiff = context.diff.length > maxDiffLength
            ? context.diff.substring(0, maxDiffLength) + '\n... [diff truncated]'
            : context.diff;
        const inputs = {
            ticketKey: context.ticket.key,
            ticketType: context.ticket.type,
            ticketTitle: context.ticket.title,
            ticketDescription: context.ticket.description?.substring(0, 2000) || 'No description',
            acceptanceCriteria: context.ticket.acceptanceCriteria ||
                context.ticket.acceptanceCriteriaList?.join('\n') ||
                'None defined',
            prTitle: context.prTitle,
            prDescription: context.prDescription || 'No description',
            filesChanged,
            diff: truncatedDiff,
            prSummary: context.prSummary || 'No summary available',
            prRisks: context.prRisks?.join(', ') || 'None identified',
            // Placeholders for ticket quality - will be filled by calling LLM
            ticketQualityScore: '{RESULT_FROM_ticketQuality.overallScore}',
            isReviewable: '{RESULT_FROM_ticketQuality.reviewable}',
            acCompliancePercentage: '{RESULT_FROM_acValidation.compliancePercentage}',
            gapsFound: '{RESULT_FROM_acValidation.gaps}',
            format_instructions: parser.getFormatInstructions(),
        };
        // Fill in the template
        let prompt = PEER_REVIEW_PROMPT;
        for (const [key, value] of Object.entries(inputs)) {
            prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        }
        return {
            step: 'peerReview',
            prompt,
            schema: PeerReviewAnalysisSchema,
            formatInstructions: parser.getFormatInstructions(),
            inputs,
            instructions: 'Perform peer review analysis and return a JSON object matching the schema',
        };
    }
    /**
     * Rate the quality of a Jira ticket (EXECUTE mode)
     */
    async rateTicketQuality(ticket) {
        if (!this.llm) {
            throw new Error('LLM is required for rateTicketQuality in EXECUTE mode');
        }
        const parser = StructuredOutputParser.fromZodSchema(TicketQualitySchema);
        const prompt = ChatPromptTemplate.fromTemplate(TICKET_QUALITY_PROMPT);
        const chain = prompt.pipe(this.llm);
        const response = await chain.invoke({
            ticketKey: ticket.key,
            ticketType: ticket.type,
            ticketTitle: ticket.title,
            ticketDescription: ticket.description || 'No description provided',
            acceptanceCriteria: ticket.acceptanceCriteria ||
                ticket.acceptanceCriteriaList?.join('\n') ||
                'No acceptance criteria defined',
            testScenarios: ticket.testScenarios?.join(', ') || 'None defined',
            hasScreenshots: ticket.hasScreenshots ? 'Yes' : 'No',
            hasDiagrams: ticket.hasDiagrams ? 'Yes' : 'No',
            storyPoints: ticket.storyPoints?.toString() || 'Not estimated',
            labels: ticket.labels.join(', ') || 'None',
            components: ticket.components.join(', ') || 'None',
            format_instructions: parser.getFormatInstructions(),
        });
        const content = typeof response === 'string' ? response : response.content?.toString() || '';
        return parser.parse(content);
    }
    /**
     * Validate acceptance criteria against PR changes
     */
    async validateAcceptanceCriteria(context) {
        if (!this.llm) {
            throw new Error('LLM is required for validateAcceptanceCriteria in EXECUTE mode');
        }
        const parser = StructuredOutputParser.fromZodSchema(AcceptanceCriteriaValidationSchema);
        const prompt = ChatPromptTemplate.fromTemplate(AC_VALIDATION_PROMPT);
        const chain = prompt.pipe(this.llm);
        // Format acceptance criteria with IDs
        const acList = context.ticket.acceptanceCriteriaList || [];
        const formattedAC = acList
            .map((ac, i) => `AC-${i + 1}: ${ac}`)
            .join('\n');
        // Format files changed
        const filesChanged = context.files
            .map((f) => `${f.path} (+${f.additions}/-${f.deletions}) [${f.status}]`)
            .join('\n');
        // Truncate diff if too long
        const maxDiffLength = 15000;
        const truncatedDiff = context.diff.length > maxDiffLength
            ? context.diff.substring(0, maxDiffLength) + '\n... [diff truncated]'
            : context.diff;
        const response = await chain.invoke({
            ticketKey: context.ticket.key,
            ticketType: context.ticket.type,
            ticketTitle: context.ticket.title,
            ticketDescription: context.ticket.description?.substring(0, 2000) || 'No description',
            acceptanceCriteria: formattedAC || 'No acceptance criteria defined',
            prTitle: context.prTitle,
            prDescription: context.prDescription || 'No description',
            filesChanged,
            diff: truncatedDiff,
            prSummary: context.prSummary || 'No summary available',
            format_instructions: parser.getFormatInstructions(),
        });
        const content = typeof response === 'string' ? response : response.content?.toString() || '';
        return parser.parse(content);
    }
    /**
     * Generate comprehensive peer review analysis
     */
    async generatePeerReview(context, ticketQuality, acValidation) {
        if (!this.llm) {
            throw new Error('LLM is required for generatePeerReview in EXECUTE mode');
        }
        const parser = StructuredOutputParser.fromZodSchema(PeerReviewAnalysisSchema);
        const prompt = ChatPromptTemplate.fromTemplate(PEER_REVIEW_PROMPT);
        const chain = prompt.pipe(this.llm);
        // Format files changed
        const filesChanged = context.files
            .map((f) => `${f.path} (+${f.additions}/-${f.deletions}) [${f.status}]`)
            .join('\n');
        // Truncate diff if too long
        const maxDiffLength = 10000;
        const truncatedDiff = context.diff.length > maxDiffLength
            ? context.diff.substring(0, maxDiffLength) + '\n... [diff truncated]'
            : context.diff;
        // Format gaps found
        const gapsFound = acValidation?.gaps
            .map((g) => `- ${g.criteriaText}: ${g.gapDescription}`)
            .join('\n') || 'None identified';
        const response = await chain.invoke({
            ticketKey: context.ticket.key,
            ticketType: context.ticket.type,
            ticketTitle: context.ticket.title,
            ticketDescription: context.ticket.description?.substring(0, 2000) || 'No description',
            acceptanceCriteria: context.ticket.acceptanceCriteria ||
                context.ticket.acceptanceCriteriaList?.join('\n') ||
                'None defined',
            prTitle: context.prTitle,
            prDescription: context.prDescription || 'No description',
            filesChanged,
            diff: truncatedDiff,
            prSummary: context.prSummary || 'No summary available',
            prRisks: context.prRisks?.join(', ') || 'None identified',
            ticketQualityScore: ticketQuality.overallScore,
            isReviewable: ticketQuality.reviewable ? 'Yes' : 'No',
            acCompliancePercentage: acValidation?.compliancePercentage ?? 'N/A',
            gapsFound,
            format_instructions: parser.getFormatInstructions(),
        });
        const content = typeof response === 'string' ? response : response.content?.toString() || '';
        return parser.parse(content);
    }
}
//# sourceMappingURL=jira-sub-agent.js.map