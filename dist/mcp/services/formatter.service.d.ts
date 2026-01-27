/**
 * Formatter Service
 * Formats analysis output for MCP responses
 * Single Responsibility: Output formatting and presentation
 */
import type { AnalysisOutputOptions } from '../types.js';
export declare class FormatterService {
    /**
     * Format complete analysis output for MCP response
     */
    static formatAnalysisOutput(options: AnalysisOutputOptions): string;
}
