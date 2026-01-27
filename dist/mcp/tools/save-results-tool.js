/**
 * Save Analysis Results Tool Handler
 * Handles the 'saveAnalysisResults' MCP tool
 * Single Responsibility: Persist analysis results to database
 */
import { saveAnalysis } from '../../db/index.js';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, DEFAULT_DASHBOARD_PORT } from '../constants.js';
export class SaveResultsTool {
    dashboardPort;
    constructor(dashboardPort = DEFAULT_DASHBOARD_PORT) {
        this.dashboardPort = dashboardPort;
    }
    async execute(args) {
        try {
            saveAnalysis({
                pr_number: args.prNumber || Math.floor(Date.now() / 1000) % 100000,
                repo_owner: args.repoOwner || 'local',
                repo_name: args.repoName || 'unknown',
                author: args.author || 'unknown',
                title: args.title,
                complexity: args.complexity,
                risks_count: args.risksCount,
                risks: JSON.stringify(args.risks),
                recommendations: JSON.stringify(args.recommendations),
                project_classification: args.projectClassification,
                peer_review_enabled: args.peerReviewEnabled ? 1 : 0,
                ticket_key: args.ticketKey,
                ticket_quality_score: args.ticketQualityScore,
                ticket_quality_tier: args.ticketQualityTier,
                ac_compliance_percentage: args.acCompliancePercentage,
                ac_requirements_met: args.acRequirementsMet,
                ac_requirements_total: args.acRequirementsTotal,
                peer_review_verdict: args.peerReviewVerdict,
                peer_review_blockers: args.peerReviewBlockers
                    ? JSON.stringify(args.peerReviewBlockers)
                    : undefined,
                peer_review_warnings: args.peerReviewWarnings
                    ? JSON.stringify(args.peerReviewWarnings)
                    : undefined,
                implementation_completeness: args.implementationCompleteness,
                quality_score: args.qualityScore,
                devops_cost_monthly: args.devopsCostMonthly,
                devops_resources: args.devopsResources,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: SUCCESS_MESSAGES.ANALYSIS_SAVED(this.dashboardPort),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: ERROR_MESSAGES.SAVE_FAILED(error.message),
                    },
                ],
            };
        }
    }
}
//# sourceMappingURL=save-results-tool.js.map