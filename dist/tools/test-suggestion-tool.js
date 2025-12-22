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
//# sourceMappingURL=test-suggestion-tool.js.map