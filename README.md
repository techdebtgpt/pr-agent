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
- **Peer Review Integration**: Validates PRs against linked Jira tickets and acceptance criteria
- **Static Analysis**: Semgrep integration for security vulnerabilities and code quality issues

## Features

✨ **Intelligent Agent Mode** - Automatically handles large diffs without chunking
🏗️ **Architecture Documentation Integration** - Uses `.arch-docs` for smarter analysis
🔬 **Static Analysis Integration** - Semgrep-powered security and code quality scanning
🔌 **Multiple AI Providers** - Anthropic Claude, OpenAI GPT, Google Gemini, Zhipu AI
🖥️ **CLI & GitHub Action** - Use locally or in CI/CD pipelines
🔗 **MCP Server** - LLM-agnostic integration with Claude Code, Cursor, Cline, and more
📊 **File-Level Analysis** - Individual risk and complexity scores per file
🎫 **Peer Review Integration** - Validates against Jira tickets and acceptance criteria
🌐 **Language-Aware** - Supports TypeScript, JavaScript, Python, Java, Go, Rust, and more
⚙️ **Configurable** - Customize models, providers, and analysis modes
🎨 **Unified Output Format** - Semgrep and AI findings use consistent formatting, sorted by severity

## Quick Reference

```bash
# Install
npm install -g @techdebtgpt/pr-agent

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
  - [MCP Server Installation](#mcp-server-installation)
- [CLI Usage](#cli-usage)
  - [Quick Start](#quick-start)
  - [Analyze Command](#analyze-command)
  - [Configuration](#configuration)
- [UI Dashboard](#ui-dashboard)
- [MCP Server](#mcp-server)
- [Architecture Documentation Integration](#architecture-documentation-integration)
- [Static Analysis Integration](#static-analysis-integration)
- [Peer Review Integration](#peer-review-integration)
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
   - **Zhipu AI**: Get your key from [Zhipu AI Platform](https://open.bigmodel.cn/) (Anthropic-compatible API)

2. **For GitHub Action**: Repository with permissions to add workflows and secrets

## Installation

### CLI Installation

Install PR Agent globally using npm:

```bash
npm install -g @techdebtgpt/pr-agent
```

Or use it directly with npx:

```bash
npx @techdebtgpt/pr-agent analyze
```

### Verify Installation

```bash
pr-agent --version
pr-agent help
```

### MCP Server Installation

> **Note**: PR Agent is primarily a CLI tool. The MCP server (`src/mcp/`) is an additional component that exposes the same analysis functionality via the Model Context Protocol for use with Claude Code, Cursor, Cline, and Windsurf.

The MCP server is **LLM-agnostic** - it uses the calling tool's AI instead of requiring API keys. It provides two tools: `analyze` (PR analysis) and `dashboard` (web UI).

```bash
# Install globally
npm install -g @techdebtgpt/pr-agent

# The MCP server binary is available as pr-agent-mcp
```

**For local development** (working on this repository), see [MCP-LOCAL-SETUP.md](MCP-LOCAL-SETUP.md) for team setup instructions.

See [MCP Server](#mcp-server) section for configuration details.

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
pr-agent analyze --provider zhipu

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

# Show project classification (business logic vs QA)
pr-agent analyze --show-classification

# Specify PR title manually
pr-agent analyze --title "Add new authentication system"

# Run test coverage analysis (requires coverage reports)
pr-agent analyze --scan-coverage

# Display coverage metrics if available
pr-agent analyze --show-coverage

# Run ESLint static analysis
pr-agent analyze --show-static-analysis

# Enable Jira peer review integration
pr-agent analyze --peer-review

# Full analysis with all static analysis features
pr-agent analyze --full --show-coverage --show-static-analysis
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
    "google": "",
    "zhipu": ""
  },
  "analysis": {
    "defaultMode": "full",
    "maxCost": 5.0,
    "autoDetectAgent": true,
    "agentThreshold": 50000,
    "language": "typescript",
    "framework": "react",
    "enableStaticAnalysis": true
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
  },
  "peerReview": {
    "enabled": false,
    "provider": "jira",
    "instanceUrl": "https://your-company.atlassian.net",
    "email": "your-email@company.com",
    "apiToken": "your-jira-api-token",
    "defaultProject": "PROJ"
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

# Zhipu AI
export ZHIPU_API_KEY="..."
```

Add to your `.bashrc`, `.zshrc`, or `.env` file for persistence.

#### Default Branch Configuration

PR Agent automatically detects the default branch for your repository using the following priority:

1. **Config file** (`git.defaultBranch`) - If set in `.pragent.config.json`, this takes highest priority
2. **GitHub API** - If `GITHUB_TOKEN` is available, fetches the default branch from GitHub
3. **Git commands** - Falls back to detecting from local git repository
4. **Fallback** - Defaults to `origin/main` if nothing else works

**Examples:**

```bash
# Set default branch in config
pr-agent config --set git.defaultBranch=origin/develop

# For repositories using 'master' as default
pr-agent config --set git.defaultBranch=origin/master

# Override for a single analysis
pr-agent analyze --branch origin/feature-branch
```

**Troubleshooting Branch Issues:**

- **Branch not found**: Run `git fetch origin` to update remote branch references
- **Wrong branch detected**: Set `git.defaultBranch` in config or use `--branch` flag
- **GitHub API errors**: Ensure `GITHUB_TOKEN` is valid, or rely on git fallback
- **Custom default branch**: Configure it explicitly: `pr-agent config --set git.defaultBranch=origin/your-branch`


## UI Dashboard

The **PeeR-Agent Dashboard** provides a visual analytics interface to track your team's code review performance, calculate ROI, and monitor code quality trends over time.

### Features
- **ROI Calculator**: Estimates money saved based on PR volume and automated review time.
- **Quality Trends**: Visualizes complexity and risk scores over time.
- **Contributors**: Tracks top PR creators and their average complexity.
- **Recent Activity**: Live feed of analyzed PRs with risk/complexity scores.

### 1. Standalone Mode (CLI)
View analytics for your local analysis directly in your browser. This mode uses a local SQLite database (`pr-agent.db`) to persist your analysis history.

```bash
# Launch the dashboard
npm run cli dashboard

# Launch on a specific port (default: 3000)
npm run cli dashboard -- -p 3001
```

Once running, the dashboard automatically opens in your default browser at `http://localhost:3000`.

### 2. Server Deployment
When deployed as a GitHub App or long-running server (e.g., on a VPS or cloud instance), the dashboard acts as the application's home page.

#### Configuration
- **Port**: Defaults to `3000`. Set via `PORT` environment variable.
- **Database**: Stores data in `pr-agent.db` in the root directory. Ensure the application has **write access** to this file/directory.

```bash
# Start the server
npm run build
npm start
```

Access the dashboard at `http://YOUR_SERVER_IP:3000/`.

**Note on Persistence**: The dashboard relies on `pr-agent.db`. If you are deploying to an ephemeral environment (like Heroku or Serverless), you will lose your history on restart unless you persist this file.

## MCP Server

> **Architecture**: PR Agent is primarily a **CLI tool**. The MCP server (`src/mcp/server.ts`) is a component that imports and reuses the CLI's core `PRAnalyzerAgent` to expose the same functionality via the Model Context Protocol.

The MCP server **mirrors the CLI workflow exactly**, providing LLM-agnostic PR analysis for any MCP-compatible tool. It uses the same configuration file (`.pragent.config.json`) and supports all CLI features.

### Supported MCP Clients

- **Claude Code** - Anthropic's official CLI
- **VS Code + GitHub Copilot** - Using `.vscode/mcp.json`
- **Cursor** - AI-first code editor
- **Cline** - VS Code extension
- **Windsurf** - AI code editor

### Configuration

**For the repository (committed for team use):**

PR Agent includes `.mcp.json` (Claude Code/Cursor) and `.vscode/mcp.json` (VS Code) that work after running `npm install --legacy-peer-deps && npm run build`.

**For published npm package (global install):**

Add to your tool's MCP configuration:

```json
{
  "mcpServers": {
    "pr-agent": {
      "command": "pr-agent-mcp"
    }
  }
}
```

From source (for local development):
```json
{
  "mcpServers": {
    "pr-agent": {
      "command": "node",
      "args": ["/absolute/path/to/pr-agent/dist/mcp/server.js"]
    }
  }
}
```

> **Local Development**: For colleagues working on this repository, see [MCP-LOCAL-SETUP.md](MCP-LOCAL-SETUP.md) for detailed setup instructions and the `npm run mcp:setup` helper script.

### Available Tools

The MCP server provides two tools (defined in `server.json`):

#### 1. `analyze` - PR/Branch Analysis

Mirrors `pr-agent analyze` CLI command exactly.

**What it does:**
- Parses git diff
- Detects security risks (hardcoded secrets, SQL injection, XSS, etc.)
- Calculates complexity scores (1-5 scale)
- Extracts Jira ticket references from PR title/branch/commits
- Includes architecture documentation context (if `.arch-docs` exists)
- Saves analysis to database

**Parameters:**
- `branch` (optional): Base branch to compare against
- `staged` (optional): Analyze staged changes instead
- `title` (optional): PR title for ticket extraction
- `cwd` (optional): Working directory
- `peerReview` (optional): Enable Jira ticket validation
- `archDocs` (optional): Include architecture docs

**Usage:** Ask your AI assistant:
```
Analyze my current branch changes
Analyze staged changes
Analyze changes against origin/develop
```

#### 2. `dashboard` - Web Dashboard

Starts the analysis history web dashboard on localhost.

**Parameters:**
- `port` (optional): Port to run on (default: 3000)

**Usage:** Ask your AI assistant:
```
Start the PR Agent dashboard
Start the dashboard on port 3001
```

### How It Works

The MCP server does everything the CLI does **except** calling AI providers:

1. **Parses git diff** (same as CLI)
2. **Detects risks** using pattern matching (same patterns as CLI)
3. **Calculates complexity** algorithmically (same algorithm as CLI)
4. **Loads arch-docs** if available (same as CLI)
5. **Extracts Jira tickets** from PR title/branch (same as CLI)
6. **Saves to database** for dashboard (same as CLI)
7. **Returns CLI-formatted output** for the calling LLM to enhance

The calling tool's LLM then adds AI-powered insights to the analysis.

### Integration with Other MCP Servers

For full functionality, install these official MCP servers alongside PR Agent:

#### Atlassian Rovo MCP Server (Jira Integration) - REQUIRED

The PR Agent extracts Jira ticket IDs (e.g., `PROJ-123`), then Claude Code uses the official Atlassian Rovo MCP server to fetch ticket details and validate against requirements.

**⚠️ Required Setup for Team Members (~ 1 hour initial setup)**

This is a **mandatory** integration for the PR Agent to work correctly with peer review features.

**Setup Instructions:**

1. **The MCP configuration is already committed** in `.mcp.json` and `.vscode/mcp.json` - no setup needed!

2. **Restart Claude Code** to load the MCP configuration

3. **Authenticate with Atlassian** (OAuth - no API tokens needed!):
   - When you first use Claude Code after setup, it will detect the Atlassian MCP server
   - Claude Code will open a browser window for you to log in with your Atlassian account
   - Grant permissions to access Jira and Confluence
   - The authentication is saved and will persist across sessions

4. **Verify the connection**:
   - Go to https://id.atlassian.com/manage-profile/apps
   - You should see "Atlassian MCP" listed under "Apps with access to your accounts"

**How It Works:**
- Uses official Atlassian Rovo MCP Server (cloud-hosted by Atlassian)
- OAuth 2.1 authentication (secure, no API tokens to manage)
- Server endpoint: `https://mcp.atlassian.com/v1/sse`
- Respects your existing Jira/Confluence permissions
- Works with any Atlassian Cloud site (e.g., `your-company.atlassian.net`)

**Troubleshooting:**
- **"Failed to reconnect to atlassian"**: Restart Claude Code and it will prompt for re-authentication
- **Connection issues**: Check your Atlassian Connected Apps at https://id.atlassian.com/manage-profile/apps
- **Permissions errors**: Make sure you have access to the Jira project in your Atlassian Cloud site

**Documentation:**
- [Official Atlassian Rovo MCP Server docs](https://support.atlassian.com/atlassian-rovo-mcp-server/)
- [Atlassian Blog: Remote MCP Server](https://www.atlassian.com/blog/announcements/remote-mcp-server)

#### GitHub MCP Server (Repository Management)
Provides GitHub API access for repository operations and PR management.

**Installation**: Already configured in `.mcp.json` and `.vscode/mcp.json`. Claude Code will prompt to enable on first use.

**Setup**: Requires GitHub authentication. See [GitHub MCP docs](https://github.com/modelcontextprotocol/servers/tree/main/src/github).

**Workflow Example:**
```
You: "Analyze my PR changes"
  ↓
PR Agent: Extracts PROJ-123 from branch, analyzes diff, detects risks
  ↓
Claude Code + Atlassian MCP: Fetches PROJ-123 details from Jira
  ↓
Result: Comprehensive review with ticket validation
```

### CLI Parity

| Feature | CLI | MCP Server |
|---------|-----|------------|
| Config file | `.pragent.config.json` | `.pragent.config.json` |
| Diff parsing | Yes | Yes |
| Risk detection | Yes | Yes |
| Complexity scoring | Yes | Yes |
| Arch-docs support | Yes | Yes |
| Jira integration | Yes | Yes |
| Dashboard | Yes | Yes |
| AI analysis | Requires API key | Uses calling LLM |

### Documentation

For complete documentation, see [docs/MCP-SERVER.md](docs/MCP-SERVER.md).

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

## Static Analysis Integration

PR Agent integrates with [Semgrep](https://semgrep.dev) for comprehensive static analysis, detecting security vulnerabilities and code quality issues.

### Prerequisites

Install Semgrep on your system:

```bash
# macOS
brew install semgrep

# Linux
pip install semgrep

# Or use Docker
docker pull semgrep/semgrep
```

For more installation options, visit: https://semgrep.dev/docs/getting-started/

### Configuration

Static analysis is configured during setup:

```bash
pr-agent config --init
```

You'll be prompted to:
1. Select your **primary programming language** (TypeScript, Python, Java, Go, etc.)
2. Specify your **framework** (React, Django, Express, etc.)
3. Enable or disable **static analysis**

**Manual Configuration:**

```bash
# Enable static analysis
pr-agent config --set analysis.enableStaticAnalysis=true

# Set language
pr-agent config --set analysis.language=typescript

# Set framework
pr-agent config --set analysis.framework=react
```

### How It Works

When static analysis is enabled:

1. **Semgrep runs** automatically during PR analysis
2. **Findings are filtered** to only include changed files
3. **AI agent analyzes** the Semgrep results
4. **Risks are integrated** into the overall assessment
5. **Recommendations** are generated based on findings

### Supported Languages

- **TypeScript** / JavaScript
- **Python** (Django, Flask)
- **Java** (Spring)
- **Go**
- **Rust**
- **C#** (.NET)
- **Ruby** (Rails)
- **PHP** (Laravel)

### Output Example

```
🔬 Static Analysis (Semgrep)

Total findings: 12
  • Errors: 3
  • Warnings: 9

Critical Issues:

  1. [ERROR] Potential SQL injection vulnerability
     File: src/database/query.ts:45
     Rule: typescript.lang.security.sql-injection
     
  2. [ERROR] Hardcoded credentials detected
     File: src/config/database.ts:12
     Rule: generic.secrets.hardcoded-credentials
     
  3. [ERROR] Use of eval() is dangerous
     File: src/utils/parser.ts:89
     Rule: javascript.lang.security.eval-detected
```

### Disabling Static Analysis

If you don't have Semgrep installed or want to skip it:

```bash
# Disable globally
pr-agent config --set analysis.enableStaticAnalysis=false

# Or skip in config during setup
# Select "No" when prompted for static analysis
```

**Note:** Static analysis will automatically be skipped if Semgrep is not installed.
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

## Peer Review Integration

PR Agent can integrate with Jira to provide intelligent peer review analysis that validates your PR against linked tickets and acceptance criteria.

### Overview

When enabled, the peer review feature acts like a **senior developer reviewing your PR**:

- **Extracts ticket references** from PR title, branch name, or commit messages
- **Fetches ticket details** from Jira (description, acceptance criteria, story points)
- **Rates ticket quality** to identify poorly-defined requirements
- **Validates implementation** against derived requirements
- **Provides verdict** with blockers, warnings, and recommendations

### Setup

1. **Configure Jira credentials** in `.pragent.config.json`:

```json
{
  "peerReview": {
    "enabled": true,
    "provider": "jira",
    "instanceUrl": "https://your-company.atlassian.net",
    "email": "your-email@company.com",
    "apiToken": "your-jira-api-token",
    "defaultProject": "PROJ",
    "analyzeAcceptanceCriteria": true,
    "rateTicketQuality": true,
    "checkScopeCreep": true
  }
}
```

2. **Get a Jira API Token**:
   - Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
   - Click "Create API token"
   - Copy the token to your config

3. **Reference tickets in your PR**:
   - PR title: `feat(PROJ-123): Add new feature`
   - Branch name: `feature/PROJ-123-add-feature`
   - Commit message: `PROJ-123: implement feature`

### Usage

```bash
# Run analysis with peer review
pr-agent analyze

# The peer review runs automatically if enabled in config
# Or enable it for a single run:
pr-agent analyze --peer-review
```

### Example Output

```
═══════════════════════════════════════════════════════════════
                    🔍 PEER REVIEW ANALYSIS
═══════════════════════════════════════════════════════════════

📋 LINKED TICKET
───────────────────────────────────────────────────────────────
   Key:    PROJ-123
   Title:  Add user authentication
   Type:   STORY
   Status: In Progress
   Points: 5

📊 TICKET QUALITY RATING
───────────────────────────────────────────────────────────────
   Overall Score: 🟢 85/100 (GOOD)

   Dimension Scores:
   • Description Clarity:     🟢 ████████░░ 85
   • Acceptance Criteria:     🟢 █████████░ 90
   • Testability:             🟡 ███████░░░ 75
   • Scope Definition:        🟢 ████████░░ 80

✅ REQUIREMENTS VALIDATION
───────────────────────────────────────────────────────────────
   Compliance: 🟢 92%

   📊 REQUIREMENT STATUS:
   ✅ Implement login endpoint with JWT tokens
   ✅ Add password validation (min 8 chars)
   🟡 Create logout endpoint
      └─ Endpoint exists but doesn't invalidate tokens
   ✅ Store hashed passwords in database

   ❌ COVERAGE GAPS:
   🟡 [MINOR] Token invalidation not implemented
      └─ Impact: Users cannot fully logout, tokens remain valid

🎯 PEER REVIEW VERDICT
───────────────────────────────────────────────────────────────
   ✅ APPROVED (Confidence: 85%)

   The PR implements the core authentication functionality as specified.
   Minor gaps in token invalidation should be addressed in a follow-up.

   Scores:
   • Implementation Completeness: 🟢 ████████░░ 88
   • Quality Score:               🟢 ████████░░ 82

   💡 RECOMMENDATIONS:
      • Add token invalidation on logout
      • Consider adding rate limiting
      • Add integration tests for auth flow

═══════════════════════════════════════════════════════════════
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable peer review integration |
| `provider` | string | `"jira"` | Issue tracker provider (currently only Jira) |
| `instanceUrl` | string | - | Your Jira instance URL |
| `email` | string | - | Your Jira account email |
| `apiToken` | string | - | Jira API token |
| `defaultProject` | string | - | Default project key for ticket extraction |
| `analyzeAcceptanceCriteria` | boolean | `true` | Validate against acceptance criteria |
| `rateTicketQuality` | boolean | `true` | Rate ticket definition quality |
| `generateTestSuggestions` | boolean | `true` | Generate test suggestions |
| `checkScopeCreep` | boolean | `true` | Detect scope creep in PRs |
| `includeTicketDetails` | boolean | `true` | Show ticket details in output |
| `verbose` | boolean | `false` | Enable verbose output |

### Benefits

✅ **Requirement Validation** - Ensures PRs implement what the ticket specifies
✅ **Quality Gate** - Catches incomplete implementations before review
✅ **Ticket Quality Feedback** - Identifies poorly-defined requirements
✅ **Scope Creep Detection** - Flags changes outside ticket scope
✅ **Senior Developer Perspective** - Catches edge cases and missing behaviors

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
           uses: techdebtgpt/pr-agent@v1.1
           with:
             config-path: .pr-analyzer.yml
           env:
             # Use one of these API keys (depending on your provider)
             ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
             # OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
             # GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
             
             # Optional: Specify provider and model
             # AI_PROVIDER: anthropic  # Options: anthropic, openai, google
             # AI_MODEL: claude-sonnet-4-5-20250929
             
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```
   > **Important**: Make sure to use the latest release tag for `techdebtgpt/pr-agent@`. Replace `@v1.1` with the latest version tag from the [releases page](https://github.com/techdebtgpt/pr-agent/releases). For example, if the latest release is `v1.2`, use `techdebtgpt/pr-agent@v1.2`.

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
2. **Fetch Changes**: The action retrieves all file changes (diffs) from the PR using GitHub API
3. **Static Analysis**: Runs Semgrep analysis (if enabled) to detect security vulnerabilities and code quality issues
4. **Architecture Context**: Loads relevant sections from `.arch-docs` (if available)
5. **AI Analysis**: Uses LangChain agent to analyze the diff with architecture context and Semgrep findings
6. **Format Results**: Formats findings in a unified Semgrep-style format, sorted by severity (critical first)

### Example Output

When PR Agent analyzes your pull request, it posts a comment like:

```markdown
## 🤖 AI Analysis (PR Agent by TechDebtGPT)

### 📋 Summary
This PR refactors the authentication middleware to use JWT tokens instead of session-based auth. It introduces a new TokenService class and updates all route handlers to use the new authentication method.

### 💡 Quick Actions

  1. 🔴 `src/middleware/auth.ts:45` - CRITICAL [Semgrep]
     🔴 **Critical**: Detected potential security vulnerability in token validation. Missing expiration check could allow expired tokens to be used.

  2. 🟡 `src/services/token.ts:23` - WARNING [AI]
     🟡 **Warning**: No token expiration handling is implemented in the TokenService. Consider adding token refresh mechanism.

  3. 🔴 - CRITICAL [AI]
     🔴 **Critical**: The migration from session to JWT may break existing authenticated users. Add integration tests for the new authentication flow.

  4. 🟡 - WARNING [AI]
     🟡 **Warning**: Error handling in the authenticate middleware could expose sensitive information. Review error messages to ensure no sensitive data leaks.

_2 more issues found._

---
_Total tokens used: 28,870_
```

**Key Features of the Output:**
- **Unified Format**: Both Semgrep and AI findings use the same consistent format
- **Sorted by Severity**: Critical issues appear first, followed by warnings
- **Source Labeling**: Each finding is labeled with `[Semgrep]` or `[AI]` to show its origin
- **File References**: Fixes include file path and line number for easy navigation
- **Actionable Recommendations**: AI-generated recommendations provide specific guidance

## Development

If you want to contribute or modify PR Agent:

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/pr-agent.git
cd pr-agent
```

### 2. Install Dependencies

```bash
# Install dependencies (use --legacy-peer-deps to handle langchain peer dependency conflicts)
npm install --legacy-peer-deps
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
# Option 1: Link locally to use 'pr-agent' command
npm link
pr-agent config --init
pr-agent analyze --staged

# Option 2: Use npm script
npm run cli config --init
npm run cli analyze --staged

# Option 3: Run directly with node
node dist/cli/index.js config --init
node dist/cli/index.js analyze --staged

# Option 4: Development mode (no build needed)
npm run dev
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
│   │   ├── zhipu.provider.ts
│   │   └── factory.ts
│   ├── issue-tracker/               # Issue tracker integrations
│   │   ├── jira-mcp-client.ts       # Jira API client
│   │   └── peer-review-integration.ts
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
4. **Static Analysis**: Runs Semgrep analysis (if enabled) to detect security vulnerabilities in changed files
5. **Arch-Docs Integration**: Loads relevant architecture documentation from `.arch-docs`
6. **AI Analysis**: Uses LangChain agent to analyze diff with full context (diff + architecture + Semgrep findings)
7. **Format Results**: Formats all findings (Semgrep + AI) in unified Semgrep-style format, sorted by severity
8. **Post Comment**: Creates a formatted comment on the PR with Quick Actions section showing critical issues first

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
npm install -g @techdebtgpt/pr-agent

# Or use npx
npx @techdebtgpt/pr-agent analyze
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

- Verify API key secret is set correctly (e.g., `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_API_KEY`)
- Check workflow permissions include `pull-requests: write` and `issues: write`
- Review Action logs for error messages
- Ensure the AI provider matches the API key (Anthropic for Claude, OpenAI for GPT, Google for Gemini)
- Verify `GITHUB_TOKEN` is available (automatically provided by GitHub Actions)

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

- **gpt-5.1** - Latest GPT-5.1 model (newest)
- **gpt-4-turbo-preview** - Latest GPT-4 (recommended)
- **gpt-4** - Stable and reliable
- **gpt-3.5-turbo** - Fast and cost-effective

Best for: Quick analysis and cost-conscious usage

### Google Gemini

- **gemini-pro** - Google's latest model
- **gemini-ultra** - Most capable Gemini model

Best for: Alternative to Claude/GPT with competitive performance

### Zhipu AI

- **claude-sonnet-4-20250514** - Via Anthropic-compatible API
- **glm-4** - Zhipu's native model

Best for: Users in China or those preferring Zhipu's platform with Claude-compatible models

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
    npm install -g @techdebtgpt/pr-agent
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
