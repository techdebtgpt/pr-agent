"use strict";
// Agent-based Analyzer for Large PRs
// Handles PRs that exceed normal token limits by using chunking and multi-pass analysis
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeLargePR = analyzeLargePR;
const factory_1 = require("./providers/factory");
const constants_1 = require("./providers/constants");
const MAX_NORMAL_TOKENS = 15000; // 15k tokens threshold
const CHUNK_OVERLAP_TOKENS = 1000; // Overlap between chunks for context
/**
 * Estimate tokens from text
 */
function estimateTokens(text) {
    return Math.ceil(text.length / constants_1.PROVIDER_CONSTANTS.CHARS_PER_TOKEN);
}
/**
 * Split diff into chunks that fit within token limits
 */
function chunkDiff(diff, maxChunkTokens) {
    const chunks = [];
    const lines = diff.split('\n');
    let currentChunk = [];
    let currentTokens = 0;
    let startIndex = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineTokens = estimateTokens(line);
        if (currentTokens + lineTokens > maxChunkTokens && currentChunk.length > 0) {
            // Save current chunk
            const chunkContent = currentChunk.join('\n');
            chunks.push({
                content: chunkContent,
                startIndex,
                endIndex: startIndex + chunkContent.length,
                tokens: currentTokens
            });
            // Start new chunk with overlap (include last N lines for context)
            const overlapLines = Math.floor(CHUNK_OVERLAP_TOKENS / (estimateTokens(line) || 1));
            currentChunk = lines.slice(Math.max(0, i - overlapLines), i + 1);
            currentTokens = estimateTokens(currentChunk.join('\n'));
            startIndex = chunks.length > 0 ? chunks[chunks.length - 1].endIndex - overlapLines * 50 : 0;
        }
        else {
            currentChunk.push(line);
            currentTokens += lineTokens;
        }
    }
    // Add remaining chunk
    if (currentChunk.length > 0) {
        chunks.push({
            content: currentChunk.join('\n'),
            startIndex,
            endIndex: startIndex + currentChunk.join('\n').length,
            tokens: currentTokens
        });
    }
    return chunks;
}
/**
 * Analyze a single chunk
 */
async function analyzeChunk(chunk, chunkIndex, totalChunks, title, config) {
    const provider = (0, factory_1.createProvider)(config);
    const chunkPrompt = `
You are analyzing chunk ${chunkIndex + 1} of ${totalChunks} from a large pull request.
${title ? `PR Title: ${title}` : ''}

This is a portion of the PR diff:
${chunk.content}

Provide a focused analysis for this chunk:
1. **Summary**: What does this specific portion change?
2. **Risks**: Any issues specific to this chunk?
3. **Complexity**: Rate complexity for this chunk (1-5).

Keep the analysis concise and focused on this specific portion.`;
    const request = {
        diff: chunk.content,
        title: title ? `${title} (chunk ${chunkIndex + 1}/${totalChunks})` : undefined
    };
    const response = await provider.analyze(request);
    return {
        summary: response.summary,
        risks: response.risks,
        complexity: response.complexity
    };
}
/**
 * Aggregate chunk analyses into a comprehensive result
 */
async function aggregateAnalyses(chunkAnalyses, config, originalTitle) {
    // Aggregate risks (remove duplicates)
    const allRisks = new Set();
    chunkAnalyses.forEach(chunk => {
        chunk.risks.forEach(risk => allRisks.add(risk));
    });
    // Calculate average complexity
    const avgComplexity = Math.round(chunkAnalyses.reduce((sum, chunk) => sum + chunk.complexity, 0) / chunkAnalyses.length);
    // Combine summaries
    const combinedSummary = chunkAnalyses
        .map((chunk, idx) => `[Part ${idx + 1}] ${chunk.summary}`)
        .join('\n\n');
    const provider = (0, factory_1.createProvider)(config);
    // Use a specialized aggregation prompt
    const aggregationDiff = `
This is a synthesized analysis from ${chunkAnalyses.length} parts of a large pull request.

${originalTitle ? `PR Title: ${originalTitle}` : ''}

Analysis Summary:
${combinedSummary}

Consolidated Risks Identified:
${Array.from(allRisks).map(r => `- ${r}`).join('\n') || 'None identified'}

Please provide a cohesive, comprehensive analysis that synthesizes these parts into a unified review.`;
    const request = {
        diff: aggregationDiff,
        title: originalTitle ? `${originalTitle} (Aggregated from ${chunkAnalyses.length} parts)` : undefined
    };
    const aggregated = await provider.analyze(request);
    // Merge the aggregated result with our consolidated data
    return {
        ...aggregated,
        risks: aggregated.risks.length > 0 ? aggregated.risks : Array.from(allRisks),
        complexity: aggregated.complexity || avgComplexity,
        provider: config.provider,
        model: config.model
    };
}
/**
 * Agent-based analysis for large PRs
 * Splits the PR into chunks and analyzes them separately, then aggregates results
 */
async function analyzeLargePR(diff, title, config, repository, prNumber) {
    const totalTokens = estimateTokens(diff);
    if (totalTokens <= MAX_NORMAL_TOKENS) {
        // Fallback to normal analysis if somehow called for small PR
        const provider = (0, factory_1.createProvider)(config);
        return await provider.analyze({ diff, title, repository, prNumber });
    }
    console.info(`📊 Large PR detected: ~${totalTokens.toLocaleString()} tokens. Using agent-based chunking analysis...`);
    // Calculate chunk size (leave room for prompt and response)
    const maxChunkTokens = Math.floor((config.maxTokens || 15000) * 0.8 // Use 80% of max tokens for chunk content
    );
    // Split into chunks
    const chunks = chunkDiff(diff, maxChunkTokens);
    console.info(`📦 Split into ${chunks.length} chunks for analysis`);
    // Analyze each chunk
    const chunkAnalyses = await Promise.all(chunks.map((chunk, idx) => analyzeChunk(chunk, idx, chunks.length, title, config)));
    console.info(`✅ Completed analysis of all ${chunks.length} chunks. Aggregating...`);
    // Aggregate results
    const finalAnalysis = await aggregateAnalyses(chunkAnalyses, config, title);
    return {
        ...finalAnalysis,
        provider: config.provider,
        model: config.model,
        // Mark as agent-analyzed
        recommendations: [
            ...(finalAnalysis.recommendations || []),
            `This PR was analyzed using agent-based chunking due to size (~${totalTokens.toLocaleString()} tokens across ${chunks.length} chunks)`
        ]
    };
}
//# sourceMappingURL=agent-analyzer.js.map