"use strict";
/**
 * Helper functions for file analysis tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareFileContent = prepareFileContent;
exports.extractRisksAndComplexity = extractRisksAndComplexity;
exports.checkImportsForFile = checkImportsForFile;
const import_checker_1 = require("./import-checker");
function prepareFileContent(file, getFileContent, getDeletedFileContent) {
    let fileContent = '';
    let analysisContext = '';
    if (file.status === 'A') {
        const fullContent = getFileContent(file.path);
        if (fullContent) {
            fileContent = fullContent;
            analysisContext = `This is a NEW FILE being added to the repository. Analyze the entire file content for:\n`;
        }
        else {
            fileContent = file.diff;
            analysisContext = `This is a NEW FILE being added (full content not available, showing diff). Analyze it for:\n`;
        }
    }
    else if (file.status === 'D') {
        const deletedContent = getDeletedFileContent(file.path);
        if (deletedContent) {
            fileContent = `=== DELETED FILE CONTENT ===\n${deletedContent}\n=== END DELETED FILE ===\n\n=== DIFF SHOWING DELETION ===\n${file.diff}`;
            analysisContext = `This file is being DELETED. Analyze:\n1. What functionality is being removed\n2. If this deletion will break any dependencies\n3. Whether other files import or depend on this file\n4. If tests or documentation need updating\n5. Overall impact on the codebase\n\n`;
        }
        else {
            fileContent = file.diff;
            analysisContext = `This file is being DELETED (full content not available, showing diff). Analyze the deletion impact:\n`;
        }
    }
    else {
        fileContent = file.diff;
        analysisContext = `This is a MODIFIED FILE. Analyze the changes shown in the diff for:\n`;
    }
    return { fileContent, analysisContext };
}
function extractRisksAndComplexity(rawResponse, analysis, state) {
    const risksMatch = rawResponse.match(/(?:###\s*)?(?:Potential\s+)?Risks?:?\s*\n(.*?)(?=\n(?:###|Complexity:|$))/is);
    if (risksMatch && risksMatch[1]) {
        const risksText = risksMatch[1].trim();
        if (!risksText.toLowerCase().includes('none') && !risksText.toLowerCase().includes('no risks')) {
            risksText.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed && (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ') || trimmed.match(/^\d+\.\s+/))) {
                    const riskText = trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').trim();
                    if (riskText && !riskText.toLowerCase().includes('none')) {
                        analysis.risks.push(riskText);
                        state.risks.add(riskText);
                    }
                }
            });
        }
    }
    const complexityMatch = rawResponse.match(/Complexity:?\s*(\d+)/i);
    if (complexityMatch && complexityMatch[1]) {
        const parsed = parseInt(complexityMatch[1]);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
            analysis.complexity = parsed;
        }
    }
}
async function checkImportsForFile(file, githubApi, repository, state) {
    const importFindings = [];
    const risksFromImports = [];
    if (githubApi && repository && (file.status === 'A' || file.status === 'M')) {
        try {
            const importCheck = await (0, import_checker_1.checkImportsAndUsages)(file, githubApi, repository);
            if (importCheck.success && importCheck.findings) {
                importFindings.push(...importCheck.findings);
                importCheck.findings.forEach(finding => {
                    if (finding.type === 'missing_import' || finding.type === 'missing_export') {
                        const riskMsg = `[File: ${finding.file}] ${finding.message}${finding.line ? ` (line ${finding.line})` : ''}`;
                        state.risks.add(riskMsg);
                        risksFromImports.push(riskMsg);
                    }
                });
            }
        }
        catch (error) {
            // Silently fail - GitHub API check is optional
        }
    }
    return { importFindings, risksFromImports };
}
//# sourceMappingURL=helpers.js.map