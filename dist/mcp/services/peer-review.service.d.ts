/**
 * Peer Review Service
 * Orchestrates peer review analysis with Jira integration
 * Single Responsibility: Peer review workflow coordination
 */
import { type PeerReviewResult } from '../../issue-tracker/index.js';
import type { PeerReviewContext } from '../types.js';
export declare class PeerReviewService {
    /**
     * Run peer review analysis in PROMPT_ONLY mode
     * Returns prompts for the calling LLM to execute
     */
    static runPeerReview(context: PeerReviewContext): Promise<PeerReviewResult | null>;
}
