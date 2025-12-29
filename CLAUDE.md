# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PR Agent is an AI-powered pull request analyzer available as both a CLI tool and a GitHub Action. It analyzes code changes using multiple AI providers (Anthropic Claude, OpenAI GPT, Google Gemini) and provides summaries, risk detection, complexity scoring, and architecture-aware recommendations.

## Build & Development Commands

```bash
# Install dependencies (--legacy-peer-deps required for LangChain peer dependency conflicts)
npm install --legacy-peer-deps

# Build everything (TypeScript + GitHub Action bundle)
npm run build

# Build TypeScript only
npm run build:tsc

# Build GitHub Action only (uses @vercel/ncc)
npm run build:action

# Clean and rebuild
npm run build:clean

# Run tests
npm test
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage

# Run single test file
npm test -- tests/config-loader.test.ts

# Development mode (no build needed)
npm run dev

# Run CLI from built dist
npm run cli
```

## Architecture

The project follows a modular monolith pattern with four layers:

### Entry Points
- `src/cli/index.ts` - CLI entry point using Commander.js
- `src/action.ts` - GitHub Action entry point
- `src/index.ts` - Probot app integration

### Core Analysis Engine
- `src/agents/pr-analyzer-agent.ts` - Main LangChain-based analysis workflow
- `src/agents/base-pr-agent-workflow.ts` - LangGraph workflow orchestration

### AI Provider Layer
- `src/providers/` - Provider implementations (Anthropic, OpenAI, Google)
- `src/providers/provider.factory.ts` - Factory pattern for instantiation
- `src/providers/provider.interface.ts` - Common interface all providers implement

### Tools & Utilities
- `src/tools/pr-analysis-tools.ts` - Diff parsing and analysis tools
- `src/utils/arch-docs-parser.ts` - Parse `.arch-docs` documentation folder
- `src/utils/arch-docs-rag.ts` - RAG (Retrieval-Augmented Generation) for architecture context
- `src/utils/branch-resolver.ts` - Git branch detection and resolution
- `src/cli/utils/config-loader.ts` - Configuration file management

### Data Flow
```
User Input → CLI/Action Interface → Config Loader → PRAnalyzerAgent
    → Parse Diff → Load Architecture Docs (optional) → Build RAG Context
    → Provider Factory → AI Provider → Structured Analysis Results
    → Format Output (CLI terminal or GitHub PR comment)
```

## Key Configuration Files

- `.pragent.config.json` - User configuration (AI provider, model, API keys, analysis settings)
- `.pr-analyzer.yml` - GitHub Action configuration
- `action.yml` - GitHub Action manifest

## Technology Stack

- **Framework**: TypeScript/Node.js (ES Modules), requires Node.js >=18.0.0
- **AI Orchestration**: LangChain v1.x with LangGraph for workflow management
- **CLI Framework**: Commander.js with Inquirer for interactive prompts
- **Testing**: Jest with ts-jest
- **Action Bundling**: @vercel/ncc bundles the GitHub Action into a single file

## Important Notes

- Large diffs (>50KB) automatically use agent-based chunking (configurable via `analysis.agentThreshold`)
- The GitHub Action bundle in `dist/` must be committed after changes to action code
- Environment variables `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_API_KEY` can be used instead of config file
- Default branch detection uses: config file → GitHub API → git commands → fallback to `origin/main`
