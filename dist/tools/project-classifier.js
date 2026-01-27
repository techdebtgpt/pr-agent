/**
 * Project Classifier Tool
 *
 * Distinguishes between business logic and QA projects based on file patterns,
 * content analysis, and project structure. This helps tailor analysis and
 * recommendations to the project type.
 *
 * Business Logic Projects:
 * - Focus on feature implementation, data models, APIs, business rules
 * - Should prioritize: architecture review, performance, security
 *
 * QA/Test Projects:
 * - Focus on testing, automation, test frameworks
 * - Should prioritize: test coverage, test quality, maintainability
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
/**
 * Patterns that indicate business logic code
 */
const BUSINESS_LOGIC_PATTERNS = {
    // File patterns
    filePatterns: [
        /src\/.*\/(models?|entities|domain)\//i,
        /src\/.*\/(services?|business|logic)\//i,
        /src\/.*\/(controllers?|handlers?|routes?)\//i,
        /src\/.*\/(api|graphql|rest)\//i,
        /src\/.*\/(repositories?|dao|database)\//i,
        /src\/.*\/(utils?|helpers?|lib)\//i,
        /src\/.*\/(components?|views?|pages?)\//i,
    ],
    // Content patterns (in code)
    contentKeywords: [
        'class ', 'interface ', 'type ', 'enum ',
        'async ', 'await ', 'Promise',
        'export ', 'import ',
        'function', 'const', 'let',
        'router.', 'app.', 'express',
        'schema', 'model', 'entity',
        'query', 'mutation', 'resolver',
        'middleware', 'validation',
        'authentication', 'authorization',
    ],
};
/**
 * Patterns that indicate QA/testing code
 */
const QA_TESTING_PATTERNS = {
    // File patterns
    filePatterns: [
        /test\//i,
        /__tests__\//i,
        /spec\//i,
        /e2e\//i,
        /integration\//i,
        /\.test\./i,
        /\.spec\./i,
        /\.e2e\./i,
        /cypress\//i,
        /playwright\//i,
        /selenium\//i,
    ],
    // Content patterns
    contentKeywords: [
        'describe(', 'it(', 'test(',
        'expect(', 'assert', 'should',
        'beforeEach', 'afterEach', 'beforeAll', 'afterAll',
        'jest.', 'vitest.', 'mocha',
        'cy.', 'page.', 'browser.',
        'fixture', 'mock', 'stub', 'spy',
        'snapshot', 'toMatchSnapshot',
        'toHaveBeenCalled', 'toEqual', 'toBe',
    ],
};
/**
 * Classify a project based on changed files
 */
export function classifyProject(changedFiles) {
    let businessLogicScore = 0;
    let qaTestingScore = 0;
    const businessLogicSignals = [];
    const qaTestingSignals = [];
    for (const file of changedFiles) {
        const { filename, patch } = file;
        // Check file patterns for business logic
        for (const pattern of BUSINESS_LOGIC_PATTERNS.filePatterns) {
            if (pattern.test(filename)) {
                businessLogicScore += 1;
                businessLogicSignals.push(`Business logic file: ${filename}`);
                break;
            }
        }
        // Check file patterns for QA/testing
        for (const pattern of QA_TESTING_PATTERNS.filePatterns) {
            if (pattern.test(filename)) {
                qaTestingScore += 1;
                qaTestingSignals.push(`Test file: ${filename}`);
                break;
            }
        }
        // Analyze patch content if available
        if (patch) {
            // Count business logic keywords
            const businessKeywordCount = BUSINESS_LOGIC_PATTERNS.contentKeywords.filter(keyword => patch.includes(keyword)).length;
            // Count QA/testing keywords
            const qaKeywordCount = QA_TESTING_PATTERNS.contentKeywords.filter(keyword => patch.includes(keyword)).length;
            if (businessKeywordCount > qaKeywordCount) {
                businessLogicScore += businessKeywordCount * 0.1;
                if (businessKeywordCount > 3) {
                    businessLogicSignals.push(`Business logic code patterns in ${filename}`);
                }
            }
            else if (qaKeywordCount > businessKeywordCount) {
                qaTestingScore += qaKeywordCount * 0.1;
                if (qaKeywordCount > 3) {
                    qaTestingSignals.push(`Test code patterns in ${filename}`);
                }
            }
        }
    }
    // Calculate total score and confidence
    const totalScore = businessLogicScore + qaTestingScore;
    const businessLogicRatio = totalScore > 0 ? businessLogicScore / totalScore : 0;
    const qaTestingRatio = totalScore > 0 ? qaTestingScore / totalScore : 0;
    // Determine project type based on ratios
    let projectType;
    let confidence;
    if (totalScore === 0) {
        projectType = 'unknown';
        confidence = 0;
    }
    else if (businessLogicRatio >= 0.8) {
        projectType = 'business_logic';
        confidence = businessLogicRatio;
    }
    else if (qaTestingRatio >= 0.8) {
        projectType = 'qa_testing';
        confidence = qaTestingRatio;
    }
    else {
        projectType = 'mixed';
        confidence = 1 - Math.abs(businessLogicRatio - qaTestingRatio);
    }
    // Generate type-specific recommendations
    const recommendations = generateRecommendations(projectType, {
        businessLogicScore,
        qaTestingScore,
        changedFilesCount: changedFiles.length,
    });
    return {
        projectType,
        confidence,
        signals: {
            businessLogicSignals,
            qaTestingSignals,
        },
        recommendations,
    };
}
/**
 * Generate recommendations based on project type
 */
function generateRecommendations(projectType, context) {
    const recommendations = [];
    switch (projectType) {
        case 'business_logic':
            recommendations.push('📋 **Business Logic Project Detected** - Focus on architecture and data flow review', '🔒 Ensure proper input validation and error handling for business rules', '⚡ Consider performance implications for data processing and API endpoints', '🔐 Review authentication and authorization for sensitive business operations', '📊 Verify data model changes are properly migrated and validated');
            if (context.businessLogicScore > 10) {
                recommendations.push('⚠️ Large business logic change - consider breaking into smaller PRs');
            }
            break;
        case 'qa_testing':
            recommendations.push('🧪 **QA/Testing Project Detected** - Focus on test quality and coverage', '✅ Ensure tests are comprehensive and cover edge cases', '🎯 Verify test assertions are meaningful and specific', '♻️ Check for test maintainability and clear test descriptions', '🚀 Consider test execution time and potential for flakiness');
            if (context.qaTestingScore > 10) {
                recommendations.push('📈 Extensive test changes - ensure all tests are passing and stable');
            }
            break;
        case 'mixed':
            recommendations.push('🔀 **Mixed Project Type** - Changes span both business logic and tests', '🔄 Ensure business logic changes are properly covered by test changes', '⚖️ Verify test changes reflect the business logic modifications', '📝 Consider separating business logic and test changes into separate commits for clarity');
            break;
        case 'unknown':
            recommendations.push('❓ **Project Type Unknown** - Unable to determine primary focus', '🔍 Consider adding more context to file organization', '📚 Review if changes follow project structure conventions');
            break;
    }
    return recommendations;
}
/**
 * Format classification results for display
 */
export function formatClassification(classification) {
    const { projectType, confidence, signals, recommendations } = classification;
    let output = `\n## 🏗️  Project Classification\n\n`;
    // Project type badge
    const typeEmoji = {
        business_logic: '💼',
        qa_testing: '🧪',
        mixed: '🔀',
        unknown: '❓',
    };
    const typeName = {
        business_logic: 'Business Logic',
        qa_testing: 'QA/Testing',
        mixed: 'Mixed',
        unknown: 'Unknown',
    };
    output += `**Type:** ${typeEmoji[projectType]} ${typeName[projectType]}\n`;
    output += `**Confidence:** ${(confidence * 100).toFixed(0)}%\n\n`;
    // Signals
    if (signals.businessLogicSignals.length > 0 || signals.qaTestingSignals.length > 0) {
        output += `### 🔍 Detection Signals\n\n`;
        if (signals.businessLogicSignals.length > 0) {
            output += `**Business Logic Indicators:**\n`;
            signals.businessLogicSignals.slice(0, 5).forEach(signal => {
                output += `  - ${signal}\n`;
            });
            if (signals.businessLogicSignals.length > 5) {
                output += `  - ...and ${signals.businessLogicSignals.length - 5} more\n`;
            }
            output += `\n`;
        }
        if (signals.qaTestingSignals.length > 0) {
            output += `**QA/Testing Indicators:**\n`;
            signals.qaTestingSignals.slice(0, 5).forEach(signal => {
                output += `  - ${signal}\n`;
            });
            if (signals.qaTestingSignals.length > 5) {
                output += `  - ...and ${signals.qaTestingSignals.length - 5} more\n`;
            }
            output += `\n`;
        }
    }
    // Recommendations
    if (recommendations.length > 0) {
        output += `### 💡 Type-Specific Recommendations\n\n`;
        recommendations.forEach(rec => {
            output += `${rec}\n\n`;
        });
    }
    return output;
}
/**
 * LangChain tool for project classification
 */
export function createProjectClassifierTool() {
    return new DynamicStructuredTool({
        name: 'classify_project_type',
        description: 'Classifies the project type (business logic vs QA/testing) based on changed files. ' +
            'This helps tailor the PR review to focus on the most relevant aspects. ' +
            'Use this early in the analysis to understand the project context.',
        schema: z.object({
            changedFiles: z.array(z.object({
                filename: z.string().describe('The file path'),
                patch: z.string().optional().describe('The git diff patch content'),
            })).describe('Array of changed files with their content'),
        }),
        func: async ({ changedFiles }) => {
            const classification = classifyProject(changedFiles);
            return formatClassification(classification);
        },
    });
}
//# sourceMappingURL=project-classifier.js.map