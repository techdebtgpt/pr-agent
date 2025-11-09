"use strict";
/**
 * Import checker utility - checks imports and usages using GitHub API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkImportsAndUsages = checkImportsAndUsages;
async function checkImportsAndUsages(file, githubApi, repository) {
    const findings = [];
    try {
        let fileContent = null;
        const ref = repository.headSha || 'HEAD';
        try {
            const { data } = await githubApi.rest.repos.getContent({
                owner: repository.owner,
                repo: repository.repo,
                path: file.path,
                ref
            });
            if (!Array.isArray(data) && data.type === 'file' && data.content) {
                fileContent = Buffer.from(data.content, 'base64').toString('utf-8');
            }
        }
        catch (error) {
            if (repository.baseSha) {
                try {
                    const { data } = await githubApi.rest.repos.getContent({
                        owner: repository.owner,
                        repo: repository.repo,
                        path: file.path,
                        ref: repository.baseSha
                    });
                    if (!Array.isArray(data) && data.type === 'file' && data.content) {
                        fileContent = Buffer.from(data.content, 'base64').toString('utf-8');
                    }
                }
                catch (e) {
                    // File doesn't exist
                }
            }
        }
        if (!fileContent) {
            return {
                success: true,
                findings: [{
                        type: 'missing_import',
                        file: file.path,
                        message: `Cannot validate imports: file content not available`
                    }]
            };
        }
        const importPatterns = [
            /import\s+(?:(?:\{([^}]*)\}|\*|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g,
            /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
        ];
        const imports = [];
        let lineNum = 1;
        for (const line of fileContent.split('\n')) {
            for (const pattern of importPatterns) {
                let match;
                while ((match = pattern.exec(line)) !== null) {
                    const importPath = match[2] || match[1];
                    if (importPath && (importPath.startsWith('.') || importPath.startsWith('/'))) {
                        const names = match[1] ? match[1].split(',').map(n => n.trim().replace(/as\s+\w+/, '').trim()) : undefined;
                        imports.push({ path: importPath, names, line: lineNum });
                    }
                }
            }
            lineNum++;
        }
        for (const imp of imports) {
            const path = require('path');
            const baseDir = path.dirname(file.path);
            let resolvedPath = path.resolve(baseDir, imp.path.replace(/\.(ts|tsx|js|jsx)$/, ''));
            resolvedPath = resolvedPath.replace(/^.*\//, '');
            const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
            let foundFile = false;
            let importedFileContent = null;
            for (const ext of extensions) {
                const candidatePath = resolvedPath + ext;
                try {
                    const { data } = await githubApi.rest.repos.getContent({
                        owner: repository.owner,
                        repo: repository.repo,
                        path: candidatePath,
                        ref
                    });
                    if (!Array.isArray(data) && data.type === 'file' && data.content) {
                        importedFileContent = Buffer.from(data.content, 'base64').toString('utf-8');
                        foundFile = true;
                        break;
                    }
                }
                catch (error) {
                    if (repository.baseSha) {
                        try {
                            const { data } = await githubApi.rest.repos.getContent({
                                owner: repository.owner,
                                repo: repository.repo,
                                path: candidatePath,
                                ref: repository.baseSha
                            });
                            if (!Array.isArray(data) && data.type === 'file' && data.content) {
                                importedFileContent = Buffer.from(data.content, 'base64').toString('utf-8');
                                foundFile = true;
                                break;
                            }
                        }
                        catch (e) {
                            // Continue to next candidate
                        }
                    }
                }
            }
            if (!foundFile) {
                findings.push({
                    type: 'missing_import',
                    file: file.path,
                    import: imp.path,
                    line: imp.line,
                    message: `Import '${imp.path}' not found in repository`
                });
                continue;
            }
            if (imp.names && importedFileContent) {
                for (const name of imp.names) {
                    const cleanName = name.trim();
                    const exportPatterns = [
                        new RegExp(`export\\s+(?:const|let|var|function|class|type|interface|enum)\\s+${cleanName}\\b`),
                        new RegExp(`export\\s*\\{[^}]*\\b${cleanName}\\b[^}]*\\}`),
                        new RegExp(`export\\s+default\\s+${cleanName}\\b`)
                    ];
                    const isExported = exportPatterns.some(pattern => pattern.test(importedFileContent));
                    if (!isExported) {
                        findings.push({
                            type: 'missing_export',
                            file: file.path,
                            import: imp.path,
                            export: cleanName,
                            line: imp.line,
                            message: `'${cleanName}' is imported from '${imp.path}' but not exported`
                        });
                    }
                }
            }
        }
        if (fileContent) {
            for (const imp of imports) {
                if (imp.names && imp.names.length > 0) {
                    for (const name of imp.names) {
                        const cleanName = name.trim();
                        const afterImport = fileContent.split('\n').slice(imp.line).join('\n');
                        const usageCount = (afterImport.match(new RegExp(`\\b${cleanName}\\b`, 'g')) || []).length;
                        if (usageCount <= 1) {
                            findings.push({
                                type: 'unused_import',
                                file: file.path,
                                import: cleanName,
                                line: imp.line,
                                message: `'${cleanName}' is imported but never used`
                            });
                        }
                    }
                }
            }
        }
        return {
            success: true,
            findings
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message,
            findings: []
        };
    }
}
//# sourceMappingURL=import-checker.js.map