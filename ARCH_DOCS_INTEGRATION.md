# Architecture Documentation Integration

## Overview

The PR Agent now includes powerful **arch-docs integration** that leverages your repository's architecture documentation to provide context-aware, intelligent PR analysis. By utilizing a RAG (Retrieval Augmented Generation) system, the agent can reference specific guidelines, patterns, and best practices from your `.arch-docs` folder when analyzing pull requests.

## Features

### 🎯 Context-Aware Analysis
- Automatically detects and parses `.arch-docs` folder
- Retrieves relevant documentation sections based on PR content
- Applies repository-specific guidelines throughout the analysis workflow

### 📊 Multi-Stage Enhancement
The arch-docs integration influences **every stage** of the analysis:
1. **File Analysis** - Understands changes in context of architecture
2. **Risk Detection** - References security guidelines and patterns
3. **Complexity Calculation** - Considers established design patterns
4. **Summary Generation** - Incorporates architectural context
5. **Refinement** - Applies code quality standards and KPIs

### 🔍 Detailed Risk Attribution
Each identified risk can include:
- **Source**: Which arch-doc file (e.g., `security.md`, `patterns.md`)
- **Excerpt**: Relevant guideline from the documentation
- **Reason**: Specific explanation of why it's a risk based on your standards

## Setup

### 1. Create `.arch-docs` Folder

Create a `.arch-docs` directory in your repository root with markdown files:

```
.arch-docs/
├── index.md              # Table of contents with smart navigation
├── architecture.md       # High-level system design
├── file-structure.md     # Project organization
├── dependencies.md       # External & internal dependencies
├── patterns.md           # Design patterns detected
├── code-quality.md       # Quality metrics
├── flows.md              # Data & control flows
├── schemas.md            # Data models
├── security.md           # Security guidelines
├── recommendations.md    # Improvement suggestions
├── kpi.md                # Repository health KPI dashboard
├── metadata.md           # Generation metadata
└── changelog.md          # Documentation update history
```

### 2. Populate Documentation

Each file should contain relevant information about your repository. For example:

**security.md:**
```markdown
# Security Guidelines

## Authentication & Authorization
- All API endpoints must validate JWT tokens
- Never commit credentials, API keys, or secrets to the repository
- Use environment variables for sensitive configuration

## Data Protection
- All user data must be encrypted at rest
- PII must be handled according to GDPR guidelines
- Database queries must use parameterized statements

## Dependencies
- Review and approve all third-party dependencies
- Keep dependencies updated for security patches
```

**patterns.md:**
```markdown
# Design Patterns

## Architecture
- Follow MVC pattern for backend services
- Use dependency injection for testability
- Implement repository pattern for data access

## Code Organization
- One component per file
- Group related files by feature
- Use barrel exports for clean imports
```

## Usage

### CLI Analysis

The arch-docs integration is **enabled by default** when analyzing PRs:

```bash
# Automatic arch-docs detection
pr-agent analyze

# Explicitly enable (same as default)
pr-agent analyze --arch-docs

# Analyze staged changes with arch-docs
pr-agent analyze --staged

# Analyze specific branch
pr-agent analyze --branch feature/new-feature
```

### Programmatic Usage

```typescript
import { PRAnalyzerAgent } from 'pr-agent';

const agent = new PRAnalyzerAgent({
  provider: 'anthropic',
  apiKey: 'your-api-key',
});

// Arch-docs automatically detected and used
const result = await agent.analyze(diff, title);

// Explicitly control arch-docs usage
const result = await agent.analyze(diff, title, mode, {
  useArchDocs: true,  // Enable arch-docs
  repoPath: '/path/to/repo',
});
```

## Output Examples

### With Arch-Docs Enhancement

When arch-docs are available, risk analysis includes specific references:

```
⚠️  Overall Risks

  1. Potential hardcoded credentials in configuration file
     📚 From security.md:
     "Never commit credentials, API keys, or secrets to the repository"
     → Code changes contain keywords like "password", "secret", or "api_key" 
       which may indicate hardcoded credentials

  2. Missing error handling in authentication flow
     📚 From patterns.md:
     "All authentication endpoints must implement comprehensive error handling"
     → The changes to auth.ts don't include try-catch blocks for potential 
       authentication failures
```

### Impact Summary

At the end of analysis, you'll see how arch-docs influenced the results:

```
📚 Architecture Documentation Impact

Documents analyzed: 12
Relevant sections used: 8

Stages influenced by arch-docs:
  🔍 file-analysis
  ⚠️ risk-detection
  📊 complexity-calculation
  📝 summary-generation
  🔄 refinement

Key insights from arch-docs integration:

  1. Enhanced 3 of 5 identified risks with specific security guidelines 
     and patterns from arch-docs
  2. Incorporated repository design patterns and architecture context 
     into comprehensive PR summary
  3. Applied repository standards, quality guidelines, and KPI metrics 
     from arch-docs to generate 5 tailored recommendations
```

## How It Works

### 1. Document Parsing
- Scans `.arch-docs` folder for markdown files
- Parses each file into structured sections
- Extracts headings, content, and metadata

### 2. RAG System
- Analyzes PR context (title, files changed, diff content)
- Extracts keywords and patterns
- Searches arch-docs for relevant sections
- Ranks results by relevance

### 3. Context Building
- Retrieves top relevant sections (default: 10)
- Always includes key documents (security, patterns, architecture)
- Formats context for inclusion in AI prompts

### 4. Enhanced Analysis

#### File Analysis
```typescript
// Prompts include relevant arch-docs sections
`Analyze these files considering the repository architecture:

[Relevant arch-docs sections...]

Files:
- src/auth/login.ts: +45 -12
...
```

#### Risk Detection
```typescript
// Security guidelines are referenced
`Analyze changes for risks using these security guidelines:

## Security Guidelines from Repository Documentation
[security.md content...]

When identifying risks, reference the specific guidelines that apply.`
```

#### Refinement
```typescript
// Recommendations align with repository standards
`Generate recommendations using these repository standards:

## Repository Improvement Guidelines
[recommendations.md content...]

## Code Quality Standards
[code-quality.md content...]

## Repository Health KPIs
[kpi.md content...]`
```

## Configuration

### Auto-Detection
By default, pr-agent automatically:
- Checks for `.arch-docs` folder in current directory
- Parses all `.md` files found
- Includes relevant sections in analysis

### Manual Control
Disable arch-docs for specific analysis:

```typescript
const result = await agent.analyze(diff, title, mode, {
  useArchDocs: false,  // Skip arch-docs
});
```

## Best Practices

### Documentation Structure
1. **Keep it Current**: Update arch-docs when architecture changes
2. **Be Specific**: Include concrete examples and code snippets
3. **Organize Well**: Use clear headings and sections
4. **Focus on Guidelines**: Emphasize "what" and "why" over "how"

### Content Recommendations
- **security.md**: Authentication, authorization, data protection, secrets management
- **patterns.md**: Design patterns, architectural principles, coding conventions
- **code-quality.md**: Code standards, testing requirements, documentation needs
- **recommendations.md**: Common improvement suggestions, refactoring priorities
- **kpi.md**: Code coverage targets, performance benchmarks, quality metrics

### File Size
- Keep individual files under 10KB for optimal performance
- Break large documents into multiple focused files
- Use `index.md` to link related documents

## API Reference

### Types

```typescript
interface ArchDocsContext {
  available: boolean;
  summary: string;
  relevantDocs: Array<{
    filename: string;
    title: string;
    section: string;
    content: string;
    relevance: number;
  }>;
  totalDocs: number;
}

interface RiskItem {
  description: string;
  archDocsReference?: {
    source: string;      // e.g., 'security.md'
    excerpt: string;     // Relevant guideline
    reason: string;      // Why this is a risk
  };
}

interface AgentResult {
  // ... other fields
  archDocsImpact?: {
    used: boolean;
    docsAvailable: number;
    sectionsUsed: number;
    influencedStages: string[];
    keyInsights: string[];
  };
}
```

### Utility Functions

```typescript
// Check if arch-docs exist
import { archDocsExists } from 'pr-agent/utils/arch-docs-parser';
const hasArchDocs = archDocsExists('/path/to/repo');

// Parse all arch-docs
import { parseAllArchDocs } from 'pr-agent/utils/arch-docs-parser';
const docs = parseAllArchDocs('/path/to/repo');

// Build context for PR
import { buildArchDocsContext } from 'pr-agent/utils/arch-docs-rag';
const context = buildArchDocsContext(docs, {
  title: 'Add new feature',
  files: [{ path: 'src/feature.ts', diff: '...' }],
  diff: '...',
});
```

## Troubleshooting

### Arch-Docs Not Detected
- Verify `.arch-docs` folder exists in repository root
- Ensure files have `.md` extension
- Check file permissions are readable

### No Arch-Docs References in Risks
- Verify `security.md` and `patterns.md` exist
- Ensure documents contain relevant guidelines
- Check that keywords in PR match documentation content

### Performance Issues
- Reduce number of markdown files (< 20 recommended)
- Keep individual files under 10KB
- Use more specific documentation sections

## Examples

### Example Security Risk with Arch-Docs

**Without arch-docs:**
```
⚠️  Risks
  1. Potential credentials in code changes
```

**With arch-docs:**
```
⚠️  Risks
  1. Potential credentials in code changes
     📚 From security.md:
     "Never commit credentials, API keys, or secrets to the repository. 
      Use environment variables for sensitive configuration."
     → Code changes contain keywords like "password", "secret", or "api_key" 
       which may indicate hardcoded credentials. This violates our security 
       policy requiring all secrets to be externalized.
```

### Example Complexity Analysis

**Arch-docs impact:**
```
📊 Overall Complexity: 4/5

Architecture Documentation Impact:
  - Referenced established design patterns from arch-docs to assess 
    code complexity accurately
  - Changes introduce new service layer that aligns with repository 
    architecture patterns (dependency injection, repository pattern)
```

## Generating Arch-Docs

You can use tools like [arch-doc-generator](https://github.com/example/arch-doc-generator) to automatically generate comprehensive architecture documentation for your repository.

```bash
# Generate arch-docs for your repository
npx arch-doc-generator analyze --output .arch-docs
```

## Contributing

To improve arch-docs integration:
1. Add new RAG algorithms in `src/utils/arch-docs-rag.ts`
2. Enhance parsing in `src/utils/arch-docs-parser.ts`
3. Update workflow nodes in `src/agents/base-pr-agent-workflow.ts`

## License

MIT - See [LICENSE](LICENSE) for details

