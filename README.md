# PR Agent

An AI-powered tool that automatically analyzes pull requests and code changes using advanced AI models (Claude, GPT, Gemini). Available as both a **CLI tool** for local development and a **GitHub Action** for CI/CD integration.

🎥 [Watch the setup tutorial on YouTube](https://youtu.be/jCdFwLJIzEU)

## Overview

PR Agent analyzes your code changes and provides:
- **Summary**: Clear description of what the change does and its purpose
- **Potential Risks**: Identification of possible bugs, edge cases, or issues
- **Complexity Rating**: A 1-5 scale rating of complexity with file-level breakdown
- **Actionable Insights**: Specific recommendations based on your codebase
- **Architecture-Aware Analysis**: Leverages your `.arch-docs` for context-aware reviews

## Features

✨ **Intelligent Agent Mode** - Automatically handles large diffs without chunking  
🏗️ **Architecture Documentation Integration** - Uses `.arch-docs` for smarter analysis  
🔌 **Multiple AI Providers** - Anthropic Claude, OpenAI GPT, Google Gemini  
🖥️ **CLI & GitHub Action** - Use locally or in CI/CD pipelines  
📊 **File-Level Analysis** - Individual risk and complexity scores per file  
⚙️ **Configurable** - Customize models, providers, and analysis modes

## Quick Reference

```bash
# Install
npm install -g pr-agent

# Setup
pr-agent config --init

# Analyze (common commands)
pr-agent analyze                    # Analyze against origin/main
pr-agent analyze --staged           # Analyze staged changes
pr-agent analyze --branch develop   # Compare with develop branch
pr-agent analyze --full --verbose   # Full analysis with details

# Configuration
pr-agent config --list              # View config
pr-agent config --set ai.provider=anthropic
pr-agent help                       # Show help
```

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [CLI Installation](#cli-installation)
  - [GitHub Action Setup](#github-action-setup)
- [CLI Usage](#cli-usage)
  - [Quick Start](#quick-start)
  - [Analyze Command](#analyze-command)
  - [Configuration](#configuration)
- [Architecture Documentation Integration](#architecture-documentation-integration)
- [GitHub Action Usage](#github-action-usage)
- [Supported AI Models](#supported-ai-models)
- [Common Use Cases](#common-use-cases)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

Before using PR Agent, you'll need:

1. **AI Provider API Key** (at least one):
   - **Anthropic Claude**: Sign up at [Anthropic Console](https://console.anthropic.com/) (Recommended)
   - **OpenAI GPT**: Get your key from [OpenAI Platform](https://platform.openai.com/)
   - **Google Gemini**: Get your key from [Google AI Studio](https://makersuite.google.com/)

2. **For GitHub Action**: Repository with permissions to add workflows and secrets

## Installation

### CLI Installation

Install PR Agent globally using npm:

```bash
npm install -g pr-agent
```

Or use it directly with npx:

```bash
npx pr-agent analyze
```

### Verify Installation

```bash
pr-agent --version
pr-agent help
```

## CLI Usage

### Quick Start

1. **Configure PR Agent** (interactive setup):

```bash
pr-agent config --init
```

This will guide you through:
- Selecting an AI provider (Anthropic/OpenAI/Google)
- Choosing a model
- Setting up API keys
- Configuring analysis preferences

2. **Analyze your changes**:

```bash
# Analyze current branch against origin/main
pr-agent analyze

# Analyze staged changes
pr-agent analyze --staged

# Analyze against a specific branch
pr-agent analyze --branch develop
```

### Analyze Command

The `analyze` command is the primary tool for analyzing code changes:

#### Basic Usage

```bash
# Default: analyze against origin/main
pr-agent analyze

# Analyze staged changes (before commit)
pr-agent analyze --staged

# Analyze against specific branch
pr-agent analyze --branch develop

# Analyze from a diff file
pr-agent analyze --file changes.diff
```

#### Analysis Modes

```bash
# Full analysis (summary + risks + complexity) - default
pr-agent analyze --full

# Only summary
pr-agent analyze --summary

# Only risks
pr-agent analyze --risks

# Only complexity
pr-agent analyze --complexity
```

#### Provider Options

```bash
# Use specific AI provider
pr-agent analyze --provider anthropic
pr-agent analyze --provider openai
pr-agent analyze --provider google

# Use specific model
pr-agent analyze --provider anthropic --model claude-sonnet-4-5-20250929
pr-agent analyze --provider openai --model gpt-4-turbo-preview
```

#### Advanced Options

```bash
# Enable verbose output (shows analysis strategy)
pr-agent analyze --verbose

# Set maximum cost limit
pr-agent analyze --max-cost 10.0

# Force agent mode for large diffs
pr-agent analyze --agent

# Specify PR title manually
pr-agent analyze --title "Add new authentication system"
```

### Configuration

PR Agent uses a `.pragent.config.json` file for configuration:

#### Interactive Setup

```bash
pr-agent config --init
```

#### Manual Configuration

```bash
# View current configuration
pr-agent config --list

# Get specific value
pr-agent config --get ai.provider

# Set specific value
pr-agent config --set ai.provider=anthropic
pr-agent config --set ai.model=claude-sonnet-4-5-20250929
pr-agent config --set ai.temperature=0.2

# Validate configuration
pr-agent config --validate

# Reset to defaults
pr-agent config --reset
```

#### Configuration File Structure

`.pragent.config.json`:

```json
{
  "ai": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5-20250929",
    "temperature": 0.2,
    "maxTokens": 2000
  },
  "apiKeys": {
    "anthropic": "sk-ant-...",
    "openai": "",
    "google": ""
  },
  "analysis": {
    "defaultMode": "full",
    "maxCost": 5.0,
    "autoDetectAgent": true,
    "agentThreshold": 50000
  },
  "git": {
    "defaultBranch": "origin/main",
    "includeUntracked": true,
    "excludePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**"
    ]
  },
  "output": {
    "verbose": false,
    "showStrategy": true,
    "showRecommendations": true
  }
}
```

#### Environment Variables

Instead of storing API keys in the config file, you can use environment variables:

```bash
# Anthropic Claude
export ANTHROPIC_API_KEY="sk-ant-..."

# OpenAI GPT
export OPENAI_API_KEY="sk-..."

# Google Gemini
export GOOGLE_API_KEY="..."
```

Add to your `.bashrc`, `.zshrc`, or `.env` file for persistence.

## Architecture Documentation Integration

PR Agent can leverage your project's architecture documentation for context-aware analysis.

### Setup Arch-Docs

1. **Create `.arch-docs` folder** in your repository root
2. **Add markdown documentation files**:

```
your-repo/
├── .arch-docs/
│   ├── index.md           # Overview and index
│   ├── architecture.md    # System architecture
│   ├── patterns.md        # Design patterns
│   ├── security.md        # Security guidelines
│   ├── flows.md          # Data flows
│   └── ...               # Other docs
```

### Auto-Generated Arch-Docs

You can generate architecture documentation automatically using [archdoc](https://archdoc.dev):

```bash
npm install -g @archdocs/cli
archdoc analyze
```

This will create a comprehensive `.arch-docs` folder with:
- **architecture.md** - System components and layers
- **patterns.md** - Design patterns detected in your code
- **security.md** - Security analysis and recommendations
- **flows.md** - Data flow visualizations
- **file-structure.md** - Project organization
- And more...

### How It Works

When you run `pr-agent analyze`, it automatically:

1. **Detects `.arch-docs` folder** in your repository
2. **Extracts relevant sections** based on your PR changes
3. **Provides context** to the AI about your architecture
4. **Identifies violations** of documented patterns or guidelines
5. **Suggests improvements** aligned with your architecture

### Example Output with Arch-Docs

```bash
$ pr-agent analyze

📚 Architecture documentation detected - including in analysis

✨ Agent Analysis Complete!

📋 Overall Summary
This PR adds a new authentication middleware...

⚠️ Risks by File

  src/middleware/auth.ts
    1. Missing error handling for token validation
       📚 From security.md:
       "All authentication endpoints must implement proper error handling..."
       → Implement try-catch blocks and return appropriate error codes

    2. Direct database access in middleware
       📚 From patterns.md:
       "Business logic should be separated from middleware..."
       → Consider moving to a service layer

📊 Overall Complexity: 3/5

📚 Architecture Documentation Impact
Documents analyzed: 8
Relevant sections used: 12

Stages influenced by arch-docs:
  🔍 file-analysis
  ⚠️ risk-detection
  📝 summary-generation

Key insights from arch-docs integration:
  1. Changes align with documented middleware pattern
  2. Security guidelines recommend additional validation
  3. Consider extracting business logic to service layer
```

### Benefits of Arch-Docs Integration

✅ **Context-Aware Analysis** - AI understands your specific architecture  
✅ **Pattern Enforcement** - Detects violations of documented patterns  
✅ **Security Alignment** - Checks against your security guidelines  
✅ **Consistency** - Ensures PRs follow established conventions  
✅ **Better Recommendations** - Suggestions aligned with your architecture

## GitHub Action Usage

### Setup Instructions

### Step 1: Add PR Agent Workflow to Your Repository

You need to create a GitHub Actions workflow file in your repository to enable PR Agent. This workflow will automatically run whenever a pull request is opened, updated, or reopened.

1. Create the workflows directory (if it doesn't exist):
   ```bash
   mkdir -p .github/workflows
   ```

2. Create the workflow file `.github/workflows/pr-analyzer.yml`:
   ```yaml
   name: PR Analyzer
   on:
     pull_request:
       types: [opened, synchronize, reopened]
   
   permissions:
     pull-requests: write
     issues: write
     contents: read
   
   jobs:
     analyze:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
   
         - name: Run PR Analyzer
           uses: techdebtgpt/pr-agent@v1.0.1
           with:
             config-path: .pr-analyzer.yml
           env:
             ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```

3. Commit and push the workflow file to your repository:
   ```bash
   git add .github/workflows/pr-analyzer.yml
   git commit -m "Add PR Analyzer workflow"
   git push
   ```

> **Note**: The workflow file must be named `pr-analyzer.yml` (or any `.yml` file in `.github/workflows/`). Once pushed, GitHub Actions will automatically recognize it and run the workflow on the specified events.

#### Quick Reference: Workflow File Structure

Your repository should have this structure after setup:

```
your-repo/
├── .github/
│   └── workflows/
       └── pr-analyzer.yml    ← This file triggers PR Agent

```

### Step 2: Configure Secrets

Add your AI provider API key to your repository secrets:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: 
   - For Anthropic: `ANTHROPIC_API_KEY`
   - For OpenAI: `OPENAI_API_KEY`
   - For Google: `GOOGLE_API_KEY`
5. Value: Your API key
6. Click **Add secret**

> **Note**: `GITHUB_TOKEN` is automatically provided by GitHub Actions, no manual setup required.

### Step 3: (Optional) Add Architecture Documentation

For enhanced, context-aware analysis, add a `.arch-docs` folder to your repository:

```bash
# Generate automatically with archdoc
npm install -g @archdocs/cli
archdoc analyze

# Or create manually
mkdir .arch-docs
# Add your architecture documentation as markdown files
```

Commit and push the `.arch-docs` folder. PR Agent will automatically use it for analysis.

### Automatic Analysis

Once set up, PR Agent automatically runs on:
- New pull requests (`opened`)
- Updates to existing pull requests (`synchronize`)
- Reopened pull requests (`reopened`)

### What Happens

1. **PR Opened/Updated**: When a PR is created or updated, the workflow triggers
2. **Fetch Changes**: The action retrieves all file changes (diffs) from the PR
3. **Architecture Context**: Loads relevant sections from `.arch-docs` (if available)
4. **AI Analysis**: Sends the diff with architecture context to the AI for analysis
5. **Post Comment**: Posts a comprehensive analysis comment on the PR

### Example Output

When PR Agent analyzes your pull request, it posts a comment like:

```markdown
## 🤖 AI Analysis

### Summary
This PR refactors the authentication middleware to use JWT tokens instead of session-based auth. It introduces a new TokenService class and updates all route handlers to use the new authentication method.

### Potential Risks
- The migration from session to JWT may break existing authenticated users
- No token expiration handling is implemented in the TokenService
- Error handling in the authenticate middleware could expose sensitive information

### Complexity: 4/5
This is a significant architectural change affecting multiple parts of the application. Careful testing of all authenticated endpoints is recommended.

### Recommendations
- Add integration tests for the new authentication flow
- Implement token refresh mechanism
- Review error messages to ensure no sensitive data leaks
```

## Development

If you want to contribute or modify PR Agent:

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/pr-agent.git
cd pr-agent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
# Build everything (TypeScript + GitHub Action)
npm run build

# Build only TypeScript
npm run build:tsc

# Build only GitHub Action
npm run build:action
```

### 4. Test Locally

#### Test CLI

```bash
# Run directly with tsx (development)
npm run dev

# Build and test
npm run build
node dist/cli/index.js analyze --help

# Test analyze command
node dist/cli/index.js analyze --staged
```

#### Test GitHub Action

1. Set environment variables:
   ```bash
   export ANTHROPIC_API_KEY="your-api-key"
   ```

2. Create a test PR in a repository you own
3. Use the action in `.github/workflows/pr-analyzer.yml`

### 5. Run Tests

```bash
npm test
```

## Project Structure

```
pr-agent/
├── src/
│   ├── action.ts                    # GitHub Action entry point
│   ├── index.ts                     # Main exports
│   ├── pr-agent.ts                  # Core PR agent logic
│   ├── types.ts                     # TypeScript type definitions
│   ├── cli/                         # CLI implementation
│   │   ├── index.ts                 # CLI entry point
│   │   ├── commands/
│   │   │   ├── analyze.command.ts   # Analyze command
│   │   │   ├── config.command.ts    # Config command
│   │   │   └── help.command.ts      # Help command
│   │   └── utils/
│   │       └── config-loader.ts     # Configuration utilities
│   ├── agents/                      # AI Agent workflows
│   │   ├── base-pr-agent-workflow.ts
│   │   └── pr-analyzer-agent.ts
│   ├── providers/                   # AI Provider integrations
│   │   ├── anthropic.provider.ts
│   │   ├── openai.provider.ts
│   │   ├── google.provider.ts
│   │   └── factory.ts
│   ├── tools/                       # Agent tools
│   │   ├── pr-analysis-tools.ts
│   │   └── index.ts
│   └── utils/                       # Utilities
│       ├── arch-docs-parser.ts      # Parse .arch-docs files
│       └── arch-docs-rag.ts         # RAG for arch-docs
├── dist/                            # Compiled JavaScript (generated)
├── action.yml                       # GitHub Action configuration
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
└── README.md                        # This file
```

## How It Works

### CLI Workflow

1. **Configuration**: Loads settings from `.pragent.config.json` or environment variables
2. **Git Integration**: Fetches diff from git (staged, branch comparison, or custom)
3. **Arch-Docs Detection**: Automatically detects and loads `.arch-docs` if available
4. **Intelligent Agent**: For large diffs (>50KB), uses agent-based analysis with:
   - File-level grouping and analysis
   - Strategic reasoning about approach
   - Context-aware risk detection
   - Architecture-guided recommendations
5. **AI Analysis**: Sends to chosen AI provider (Claude/GPT/Gemini) with architecture context
6. **Results Display**: Shows summary, risks, complexity, and recommendations in terminal

### GitHub Action Workflow

1. **Workflow Setup**: The `.github/workflows/pr-analyzer.yml` file defines when and how PR Agent runs
2. **Trigger**: GitHub Action triggers automatically on PR events (`opened`, `synchronize`, `reopened`)
3. **Fetch Diffs**: Uses GitHub API to retrieve all changed files and their diffs
4. **Arch-Docs Integration**: Loads relevant architecture documentation from `.arch-docs`
5. **AI Analysis**: Sends to AI with full context (diff + architecture)
6. **Parse Response**: Extracts structured insights with architecture-aware recommendations
7. **Post Comment**: Creates a formatted comment on the PR using GitHub API

### Intelligent Agent System

For large or complex PRs, PR Agent uses an intelligent agent system that:

- **Analyzes files in groups** rather than all at once
- **Maintains context** across the entire analysis
- **Reasons strategically** about the best analysis approach
- **Integrates arch-docs** at each stage for context-aware insights
- **Provides file-level details** with individual risk and complexity scores
- **No manual chunking required** - handles diffs of any size

## Troubleshooting

### CLI Issues

#### Command Not Found

```bash
# If pr-agent command not found after npm install -g
npm install -g pr-agent

# Or use npx
npx pr-agent analyze
```

#### API Key Not Recognized

```bash
# Check if environment variable is set
echo $ANTHROPIC_API_KEY

# Set it if missing
export ANTHROPIC_API_KEY="sk-ant-..."

# Or configure with CLI
pr-agent config --init
```

#### No Config File Found

```bash
# Initialize configuration
pr-agent config --init

# Or create manually
touch .pragent.config.json
pr-agent config --set ai.provider=anthropic
```

#### Git Diff Issues

```bash
# Make sure you're in a git repository
git status

# Check for changes
git diff origin/main

# If origin/main doesn't exist
git diff main
```

#### Analysis Fails

- **Rate Limit**: Reduce diff size or wait before retrying
- **Invalid API Key**: Check key is correct and has credits
- **Model Not Available**: Try different model with `--model` flag
- **Network Issues**: Check internet connection

### GitHub Action Issues

#### Action Not Running

- Verify the workflow file `.github/workflows/pr-analyzer.yml` exists and is committed to your repository
- Check that the workflow file is in the correct location (`.github/workflows/` directory)
- Verify workflow triggers match PR events (`opened`, `synchronize`, `reopened`)
- Ensure repository permissions allow Actions to run (check repository Settings → Actions → General)
- Check if Actions are enabled for your repository

#### No Comments Posted

- Verify API key secret is set correctly (e.g., `ANTHROPIC_API_KEY`)
- Check workflow permissions include `pull-requests: write`
- Review Action logs for error messages
- Ensure the AI provider matches the API key (Anthropic for Claude, OpenAI for GPT, etc.)

#### Analysis Failed

- Check if your API key is valid and has available credits
- Verify the API key has not expired
- Review Action logs for detailed error messages
- For very large PRs, the agent mode should handle it automatically

### Arch-Docs Issues

#### Arch-Docs Not Detected

```bash
# Check if folder exists
ls -la .arch-docs

# Create if missing
mkdir .arch-docs

# Generate with archdoc
npm install -g @archdocs/cli
archdoc analyze
```

#### Arch-Docs Not Being Used

- Make sure `.arch-docs` folder is in repository root
- Verify folder contains `.md` files
- Check CLI output for "Architecture documentation detected" message
- Use `--arch-docs` flag explicitly if needed

### Large PRs

- The intelligent agent automatically handles large diffs (>50KB)
- No manual chunking required
- Set `--max-cost` to control API spending
- Use `--verbose` to see how the agent processes large diffs


## Supported AI Models

### Anthropic Claude (Recommended)

- **claude-sonnet-4-5-20250929** - Latest, most capable (default)
- **claude-3-5-sonnet-20241022** - Fast and efficient
- **claude-3-opus-20240229** - Most powerful for complex analysis

Best for: Overall quality, architecture understanding, and complex reasoning

### OpenAI GPT

- **gpt-4-turbo-preview** - Latest GPT-4 (recommended)
- **gpt-4** - Stable and reliable
- **gpt-3.5-turbo** - Fast and cost-effective

Best for: Quick analysis and cost-conscious usage

### Google Gemini

- **gemini-pro** - Google's latest model
- **gemini-ultra** - Most capable Gemini model

Best for: Alternative to Claude/GPT with competitive performance

## Common Use Cases

### 1. Pre-Commit Review

Review your changes before committing:

```bash
# Stage your changes
git add .

# Analyze before committing
pr-agent analyze --staged

# If all looks good, commit
git commit -m "Your message"
```

### 2. Feature Branch Review

Compare your feature branch against main:

```bash
git checkout feature-branch
pr-agent analyze --branch main
```

### 3. Daily Standup Summary

Get a quick summary of your work:

```bash
pr-agent analyze --summary
```

### 4. Pre-PR Quality Check

Before opening a PR, ensure quality:

```bash
# Full analysis
pr-agent analyze --full --verbose

# Check for high-risk changes
pr-agent analyze --risks
```

### 5. Team Code Review

Use in your PR workflow:

```bash
# As PR author: analyze before pushing
pr-agent analyze

# As reviewer: analyze the PR branch
git checkout pr-branch
pr-agent analyze --branch main
```

### 6. Architecture Compliance

Ensure changes align with architecture:

```bash
# Make sure .arch-docs exists
archdoc analyze

# Analyze with arch-docs
pr-agent analyze --arch-docs
```

### 7. CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/pr-check.yml
- name: PR Quality Check
  run: |
    npm install -g pr-agent
    pr-agent analyze --full
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### 8. Multi-Provider Comparison

Compare analysis from different AI providers:

```bash
pr-agent analyze --provider anthropic > claude-analysis.txt
pr-agent analyze --provider openai > gpt-analysis.txt
pr-agent analyze --provider google > gemini-analysis.txt
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request


## Support

For issues, questions, or feature requests:
- Open an issue on [GitHub Issues](https://github.com/YOUR_USERNAME/pr-agent/issues)
- Check existing issues for solutions
- Review Action logs for debugging




## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Made with ❤️ for better code reviews**

If you find PR Agent helpful, please ⭐ star the repository!
