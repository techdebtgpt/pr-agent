# PR Agent MCP Server

LLM-agnostic MCP (Model Context Protocol) server for AI-powered pull request analysis.

## Overview

The PR Agent MCP Server provides the same powerful analysis capabilities as the CLI, but designed for integration with any MCP-compatible tool (Claude Code, Cursor, Windsurf, etc.). The calling tool's LLM performs the AI analysis, making this server completely LLM-agnostic.

## Installation

### From npm (Recommended)

```bash
npm install -g @techdebtgpt/pr-agent
```

### From Source

```bash
git clone https://github.com/techdebtgpt/pr-agent.git
cd pr-agent
npm install --legacy-peer-deps
npm run build
```

## Configuration

### Claude Code

Add to `~/.claude/settings.json` or project `.claude/settings.json`:

```json
{
  "mcpServers": {
    "pr-agent": {
      "command": "pr-agent-mcp"
    }
  }
}
```

### Cursor / Windsurf / Other MCP Clients

```json
{
  "mcpServers": {
    "pr-agent": {
      "command": "npx",
      "args": ["-y", "@techdebtgpt/pr-agent", "mcp"]
    }
  }
}
```

### From Source

```json
{
  "mcpServers": {
    "pr-agent": {
      "command": "node",
      "args": ["/path/to/pr-agent/dist/mcp/server.js"]
    }
  }
}
```

## Available Tools

### `analyze`

Analyzes PR/branch changes with comprehensive diff parsing, risk detection, and complexity scoring.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `branch` | string | auto-detected | Base branch to compare against |
| `staged` | boolean | false | Analyze staged changes instead |
| `title` | string | from git | PR title for ticket extraction |
| `cwd` | string | current dir | Working directory |
| `peerReview` | boolean | from config | Enable Jira ticket validation |
| `archDocs` | boolean | from config | Include architecture docs context |
| `verbose` | boolean | false | Include debug information |

**Example Usage:**
```
Analyze my current branch changes against main
```

**Output includes:**
- Summary (files changed, lines, languages)
- Complexity score (1-5) with factors
- Detected risks (security, quality, breaking changes)
- File change details
- Linked Jira tickets (if found)
- Architecture documentation context (if available)

### `dashboard`

Starts a local web dashboard for viewing analysis history and metrics.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `port` | number | 3000 | Port to run dashboard on |

**Example Usage:**
```
Start the PR Agent dashboard on port 3001
```

## Configuration File

The MCP server uses `.pragent.config.json` (same as CLI):

```json
{
  "git": {
    "defaultBranch": "origin/main"
  },
  "analysis": {
    "language": "typescript",
    "framework": "react"
  },
  "peerReview": {
    "enabled": true,
    "provider": "jira",
    "defaultProject": "PROJ"
  }
}
```

> Note: AI provider settings (`ai.provider`, `apiKeys`) are ignored by the MCP server since the calling tool provides the AI.

## Risk Detection

The server detects these risk patterns:

**Security (Critical):**
- Hardcoded passwords, API keys, secrets
- Command injection vulnerabilities
- SQL injection patterns

**Security (Warning):**
- `eval()` usage
- `innerHTML` / `dangerouslySetInnerHTML`

**Quality:**
- TODO/FIXME comments
- Excessive console.log statements
- Missing error handling

**Breaking Changes:**
- Removed/modified exports

## Peer Review (Jira Integration)

When Jira is configured, the server extracts ticket references from:
1. PR title (e.g., "PROJ-123: Add feature")
2. Branch name (e.g., "feature/PROJ-123-add-feature")
3. Commit messages

The calling LLM can then use Jira MCP tools to validate against ticket requirements.

## Architecture Documentation

If your repo has a `.arch-docs` folder, the server:
1. Loads all markdown documentation
2. Identifies relevant sections based on changed files
3. Includes context in analysis output

## Data Storage

Analysis results are saved to `pr-agent.db` (SQLite) for dashboard viewing:
- PR analysis history
- Code quality trends
- ROI metrics

## Publishing

### To npm

```bash
npm login
npm publish
```

### To MCP Registry

See [Publishing Guide](https://modelcontextprotocol.info/tools/registry/publishing/)

### To Smithery

1. Connect your GitHub repository at [smithery.ai](https://smithery.ai)
2. Start a deployment
3. Your server becomes discoverable and installable

## Security Considerations

- The server runs locally in the user's environment
- No external API calls are made (LLM-agnostic)
- Credentials in config files stay local
- Use environment variables for sensitive data

## Troubleshooting

### Server Not Starting

```bash
# Test manually
node dist/mcp/server.js

# Check for errors
pr-agent-mcp 2>&1
```

### Config Not Loading

The server looks for `.pragent.config.json` in:
1. Current working directory
2. Parent directories (up to root)

### Dashboard Port in Use

```
Start the dashboard on port 3001
```

## License

MIT License - see [LICENSE](../../LICENSE)
