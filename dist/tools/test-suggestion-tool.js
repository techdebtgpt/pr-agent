/**
 * Test Suggestion Tool for PR Analysis
 * Generates test code suggestions for code changes without corresponding tests
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
/**
 * Detect test framework from project configuration
 */
export function detectTestFramework(repoPath = '.') {
    const packageJsonPath = path.join(repoPath, 'package.json');
    // Check for Node.js project
    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const deps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies,
            };
            // Check for Jest
            if (deps.jest || deps['@jest/core'] || fs.existsSync(path.join(repoPath, 'jest.config.js')) || fs.existsSync(path.join(repoPath, 'jest.config.ts'))) {
                return { framework: 'jest', detected: true, configFile: 'jest.config.js' };
            }
            // Check for Vitest
            if (deps.vitest || fs.existsSync(path.join(repoPath, 'vitest.config.js')) || fs.existsSync(path.join(repoPath, 'vitest.config.ts'))) {
                return { framework: 'vitest', detected: true, configFile: 'vitest.config.js' };
            }
            // Check for Mocha
            if (deps.mocha || fs.existsSync(path.join(repoPath, '.mocharc.js')) || fs.existsSync(path.join(repoPath, '.mocharc.json'))) {
                return { framework: 'mocha', detected: true, configFile: '.mocharc.js' };
            }
        }
        catch (e) {
            // Ignore JSON parse errors
        }
    }
    // Check for Python project
    const pytestIni = path.join(repoPath, 'pytest.ini');
    const pyprojectToml = path.join(repoPath, 'pyproject.toml');
    const setupPy = path.join(repoPath, 'setup.py');
    if (fs.existsSync(pytestIni)) {
        return { framework: 'pytest', detected: true, configFile: 'pytest.ini' };
    }
    if (fs.existsSync(pyprojectToml)) {
        try {
            const content = fs.readFileSync(pyprojectToml, 'utf-8');
            if (content.includes('[tool.pytest]') || content.includes('pytest')) {
                return { framework: 'pytest', detected: true, configFile: 'pyproject.toml' };
            }
        }
        catch (e) {
            // Ignore read errors
        }
    }
    if (fs.existsSync(setupPy)) {
        try {
            const content = fs.readFileSync(setupPy, 'utf-8');
            if (content.includes('pytest')) {
                return { framework: 'pytest', detected: true, configFile: 'setup.py' };
            }
        }
        catch (e) {
            // Ignore read errors
        }
    }
    return { framework: 'other', detected: false };
}
/**
 * Check if a file is a test file
 */
export function isTestFile(filePath) {
    const testPatterns = [
        /\.test\.[jt]sx?$/,
        /\.spec\.[jt]sx?$/,
        /_test\.py$/,
        /test_.*\.py$/,
        /\.test\.go$/,
        /_test\.go$/,
        /Test\.java$/,
        /\.test\.rs$/,
    ];
    return testPatterns.some(pattern => pattern.test(filePath));
}
/**
 * Check if a file is a code file that should have tests
 */
export function isCodeFile(filePath) {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rs', '.rb', '.cs'];
    const ext = path.extname(filePath).toLowerCase();
    // Exclude config files, type definitions, etc.
    if (filePath.includes('.d.ts') || filePath.includes('.config.') || filePath.includes('index.')) {
        return false;
    }
    return codeExtensions.includes(ext);
}
/**
 * Generate test file path suggestion
 */
export function suggestTestFilePath(sourceFilePath, framework) {
    const ext = path.extname(sourceFilePath);
    const baseName = path.basename(sourceFilePath, ext);
    const dirName = path.dirname(sourceFilePath);
    // For TypeScript/JavaScript
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        if (framework === 'jest' || framework === 'vitest') {
            // Check if there's a __tests__ folder pattern
            if (dirName.includes('src')) {
                const testsDir = dirName.replace('src', 'tests');
                return path.join(testsDir, `${baseName}.test${ext}`);
            }
            return path.join(dirName, `${baseName}.test${ext}`);
        }
        if (framework === 'mocha') {
            return path.join(dirName, `${baseName}.spec${ext}`);
        }
    }
    // For Python
    if (ext === '.py') {
        return path.join(dirName, `test_${baseName}.py`);
    }
    // For Go
    if (ext === '.go') {
        return path.join(dirName, `${baseName}_test.go`);
    }
    // Default
    return path.join(dirName, `${baseName}.test${ext}`);
}
/**
 * Create test suggestion tool
 */
export function createTestSuggestionTool() {
    return new DynamicStructuredTool({
        name: 'suggest_tests',
        description: 'Analyze code changes and suggest tests for files without test coverage',
        schema: z.object({
            files: z.array(z.object({
                path: z.string(),
                diff: z.string(),
                additions: z.number(),
            })).describe('Array of changed files to analyze'),
            framework: z.string().optional().describe('Test framework to use'),
            repoPath: z.string().optional().describe('Repository path for framework detection'),
        }),
        func: async ({ files, framework: providedFramework, repoPath }) => {
            const detectedFramework = detectTestFramework(repoPath || '.');
            const testFramework = providedFramework || detectedFramework.framework;
            // Filter to code files only
            const codeFiles = files.filter(f => isCodeFile(f.path) && !isTestFile(f.path));
            // Check if corresponding test files exist in the PR
            const testFilesInPR = files.filter(f => isTestFile(f.path)).map(f => f.path);
            const filesNeedingTests = [];
            for (const file of codeFiles) {
                // Check if a test for this file is included in the PR
                const baseNameWithoutExt = path.basename(file.path, path.extname(file.path));
                const hasPRTest = testFilesInPR.some(testPath => testPath.toLowerCase().includes(baseNameWithoutExt.toLowerCase()));
                if (!hasPRTest && file.additions > 5) { // Only suggest for files with significant changes
                    // Extract added code from diff
                    const addedLines = file.diff
                        .split('\n')
                        .filter(line => line.startsWith('+') && !line.startsWith('+++'))
                        .map(line => line.substring(1))
                        .join('\n');
                    filesNeedingTests.push({
                        file: file.path,
                        hasPRTest: false,
                        suggestedTestPath: suggestTestFilePath(file.path, testFramework),
                        codeSnippet: addedLines.substring(0, 1000), // Limit for context
                    });
                }
            }
            return JSON.stringify({
                testFramework,
                frameworkDetected: detectedFramework.detected,
                configFile: detectedFramework.configFile,
                filesAnalyzed: codeFiles.length,
                filesNeedingTests: filesNeedingTests.length,
                files: filesNeedingTests,
            });
        },
    });
}
/**
 * Generate test code template based on framework and code
 */
export function generateTestTemplate(framework, filePath, codeSnippet, functionNames = []) {
    const baseName = path.basename(filePath, path.extname(filePath));
    const modulePath = filePath.replace(/\.[^/.]+$/, '');
    switch (framework) {
        case 'jest':
        case 'vitest':
            return `import { describe, it, expect } from '${framework === 'vitest' ? 'vitest' : '@jest/globals'}';
import { /* exported functions */ } from '${modulePath}';

describe('${baseName}', () => {
${functionNames.map(fn => `  describe('${fn}', () => {
    it('should work correctly', () => {
      // TODO: Add test implementation
      expect(true).toBe(true);
    });

    it('should handle edge cases', () => {
      // TODO: Add edge case tests
    });
  });
`).join('\n') || `  it('should be implemented', () => {
    // TODO: Add tests for ${baseName}
    expect(true).toBe(true);
  });
`}
});
`;
        case 'mocha':
            return `const { expect } = require('chai');
const { /* exported functions */ } = require('${modulePath}');

describe('${baseName}', function() {
${functionNames.map(fn => `  describe('${fn}', function() {
    it('should work correctly', function() {
      // TODO: Add test implementation
      expect(true).to.be.true;
    });
  });
`).join('\n') || `  it('should be implemented', function() {
    // TODO: Add tests for ${baseName}
    expect(true).to.be.true;
  });
`}
});
`;
        case 'pytest':
            return `import pytest
from ${modulePath.replace(/\//g, '.')} import *

class Test${baseName.charAt(0).toUpperCase() + baseName.slice(1)}:
${functionNames.map(fn => `    def test_${fn}_works(self):
        """Test that ${fn} works correctly."""
        # TODO: Add test implementation
        assert True

    def test_${fn}_edge_cases(self):
        """Test ${fn} edge cases."""
        # TODO: Add edge case tests
        assert True
`).join('\n') || `    def test_implementation(self):
        """Test ${baseName} functionality."""
        # TODO: Add tests
        assert True
`}
`;
        default:
            return `// TODO: Add tests for ${baseName}
// Detected framework: ${framework}
// 
// Test the following functionality:
${functionNames.map(fn => `// - ${fn}`).join('\n') || '// - Main module functionality'}
`;
    }
}
/**
 * Analyze existing test file and suggest enhancements
 */
export function analyzeTestQuality(testFile, sourceFile, framework) {
    const testContent = testFile.diff;
    const sourceContent = sourceFile.diff;
    // Extract existing test cases from the test file
    const currentTests = [];
    const testPatterns = [
        /(?:test|it|describe)\s*\(\s*['"`]([^'"`]+)['"`]/g, // Jest/Mocha/Vitest
        /def\s+test_(\w+)/g, // Python
    ];
    for (const pattern of testPatterns) {
        let match;
        while ((match = pattern.exec(testContent)) !== null) {
            currentTests.push(match[1]);
        }
    }
    // Analyze source code to identify testable scenarios
    const missingScenarios = [];
    const suggestions = [];
    // Check for common missing test scenarios
    // 1. Error handling tests
    if (sourceContent.includes('throw ') || sourceContent.includes('raise ') ||
        sourceContent.includes('Error(') || sourceContent.includes('Exception(')) {
        const hasErrorTests = currentTests.some(t => /error|exception|throw|fail|invalid/i.test(t));
        if (!hasErrorTests) {
            missingScenarios.push('Error handling tests');
            suggestions.push('⚠️  Add tests for error conditions and exception handling');
        }
    }
    // 2. Edge case tests
    const hasEdgeCaseTests = currentTests.some(t => /edge|boundary|limit|empty|null|zero|max|min/i.test(t));
    if (!hasEdgeCaseTests && sourceContent.length > 100) {
        missingScenarios.push('Edge case tests');
        suggestions.push('🔍 Add tests for edge cases (null, undefined, empty, boundary values)');
    }
    // 3. Async operation tests
    if ((sourceContent.includes('async ') || sourceContent.includes('await ') ||
        sourceContent.includes('Promise') || sourceContent.includes('.then(')) &&
        !testContent.includes('async ')) {
        missingScenarios.push('Async operation tests');
        suggestions.push('⏱️  Add async/await tests for asynchronous operations');
    }
    // 4. Input validation tests
    if (sourceContent.includes('validate') || sourceContent.includes('check') ||
        sourceContent.match(/if\s*\(/)) {
        const hasValidationTests = currentTests.some(t => /valid|invalid|check|verify/i.test(t));
        if (!hasValidationTests) {
            missingScenarios.push('Input validation tests');
            suggestions.push('✅ Add tests for input validation and type checking');
        }
    }
    // 5. Return value tests
    const hasReturnTests = currentTests.some(t => /return|result|output|expect/i.test(t));
    if (!hasReturnTests && (sourceContent.includes('return ') || sourceContent.includes('yield '))) {
        missingScenarios.push('Return value verification');
        suggestions.push('🎯 Add explicit tests for expected return values and types');
    }
    // 6. Side effects and state changes
    if (sourceContent.match(/\.\w+\s*=/g) || sourceContent.includes('setState') ||
        sourceContent.includes('this.')) {
        const hasStateTests = currentTests.some(t => /state|change|update|mutate/i.test(t));
        if (!hasStateTests) {
            missingScenarios.push('State change tests');
            suggestions.push('🔄 Add tests to verify state changes and side effects');
        }
    }
    // 7. Integration/interaction tests
    if (sourceContent.includes('import ') && currentTests.length < 3) {
        suggestions.push('🔗 Consider adding integration tests for component interactions');
    }
    // Generate enhancement code suggestions
    let enhancementCode = '';
    if (missingScenarios.length > 0) {
        enhancementCode = generateEnhancementCode(framework, testFile.path, missingScenarios);
    }
    return {
        testFile: testFile.path,
        sourceFile: sourceFile.path,
        currentTests,
        missingScenarios,
        suggestions,
        enhancementCode,
    };
}
/**
 * Generate code for test enhancements
 */
function generateEnhancementCode(framework, testFilePath, missingScenarios) {
    const baseName = path.basename(testFilePath, path.extname(testFilePath));
    switch (framework) {
        case 'jest':
        case 'vitest':
            return `
// === Suggested Test Enhancements ===

${missingScenarios.includes('Error handling tests') ? `
describe('Error Handling', () => {
  it('should handle invalid input gracefully', () => {
    expect(() => functionName(null)).toThrow();
    expect(() => functionName(undefined)).toThrow();
  });
  
  it('should throw appropriate error for edge cases', () => {
    expect(() => functionName('')).toThrow('Invalid input');
  });
});
` : ''}

${missingScenarios.includes('Edge case tests') ? `
describe('Edge Cases', () => {
  it('should handle empty input', () => {
    expect(functionName('')).toBe(expectedEmptyResult);
  });
  
  it('should handle null and undefined', () => {
    expect(functionName(null)).toBe(null);
    expect(functionName(undefined)).toBe(undefined);
  });
  
  it('should handle boundary values', () => {
    expect(functionName(0)).toBe(expectedZeroResult);
    expect(functionName(Number.MAX_VALUE)).toBeDefined();
  });
});
` : ''}

${missingScenarios.includes('Async operation tests') ? `
describe('Async Operations', () => {
  it('should resolve successfully', async () => {
    const result = await asyncFunction();
    expect(result).toBeDefined();
  });
  
  it('should handle async errors', async () => {
    await expect(asyncFunction('invalid')).rejects.toThrow();
  });
});
` : ''}
`;
        case 'mocha':
            return `
// === Suggested Test Enhancements ===

${missingScenarios.includes('Error handling tests') ? `
describe('Error Handling', function() {
  it('should handle invalid input gracefully', function() {
    expect(() => functionName(null)).to.throw();
  });
});
` : ''}

${missingScenarios.includes('Edge case tests') ? `
describe('Edge Cases', function() {
  it('should handle empty input', function() {
    expect(functionName('')).to.equal(expectedEmptyResult);
  });
  
  it('should handle boundary values', function() {
    expect(functionName(0)).to.be.defined;
  });
});
` : ''}
`;
        case 'pytest':
        case 'unittest':
            return `
# === Suggested Test Enhancements ===

${missingScenarios.includes('Error handling tests') ? `
def test_error_handling():
    """Test error handling with invalid inputs."""
    with pytest.raises(ValueError):
        function_name(None)
    with pytest.raises(ValueError):
        function_name('')
` : ''}

${missingScenarios.includes('Edge case tests') ? `
def test_edge_cases():
    """Test edge cases and boundary conditions."""
    assert function_name('') == expected_empty_result
    assert function_name(0) == expected_zero_result
    assert function_name(None) is None
` : ''}

${missingScenarios.includes('Async operation tests') ? `
@pytest.mark.asyncio
async def test_async_operations():
    """Test asynchronous operations."""
    result = await async_function()
    assert result is not None
` : ''}
`;
        default:
            return `// Consider adding tests for: ${missingScenarios.join(', ')}`;
    }
}
/**
 * Format test enhancement for display
 */
export function formatTestEnhancement(enhancement) {
    let output = `\n### 🔬 Test Enhancement: ${path.basename(enhancement.testFile)}\n\n`;
    output += `**Source File:** ${enhancement.sourceFile}\n`;
    output += `**Current Tests:** ${enhancement.currentTests.length} test case(s)\n\n`;
    if (enhancement.currentTests.length > 0 && enhancement.currentTests.length <= 5) {
        output += `**Existing Tests:**\n`;
        enhancement.currentTests.forEach(test => {
            output += `  ✓ ${test}\n`;
        });
        output += `\n`;
    }
    if (enhancement.missingScenarios.length > 0) {
        output += `**Missing Test Scenarios:**\n`;
        enhancement.missingScenarios.forEach(scenario => {
            output += `  ⚠️  ${scenario}\n`;
        });
        output += `\n`;
    }
    if (enhancement.suggestions.length > 0) {
        output += `**Recommendations:**\n`;
        enhancement.suggestions.forEach(suggestion => {
            output += `  ${suggestion}\n`;
        });
        output += `\n`;
    }
    return output;
}
//# sourceMappingURL=test-suggestion-tool.js.map