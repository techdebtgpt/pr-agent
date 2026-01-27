# PR Agent MCP Server

The PR Agent MCP (Model Context Protocol) Server mirrors the CLI workflow exactly, providing LLM-agnostic PR analysis for any MCP-compatible tool.

## Key Features

- **Mirrors CLI Exactly**: Same workflow, same configuration, same output format
- **LLM-Agnostic**: No API keys required - uses the calling tool's LLM
- **Same Config File**: Uses `.pragent.config.json` just like the CLI
- **Full Feature Support**: Jira peer review, arch-docs, all CLI options
- **Web Dashboard**: Built-in dashboard for analysis history

## How It Works

The MCP server does everything the CLI does **except** calling AI providers:

1. **Parses git diff** (same as CLI)
2. **Detects risks** using pattern matching (same patterns as CLI)
3. **Calculates complexity** algorithmically (same algorithm as CLI)
4. **Loads arch-docs** if available (same as CLI)
5. **Extracts Jira tickets** from PR title/branch (same as CLI)
6. **Saves to database** for dashboard (same as CLI)
7. **Returns formatted output** for the calling LLM to enhance

The calling tool's LLM (Claude Code, Cursor, etc.) then adds AI-powered insights to the analysis.

## Installation

### Option 1: Global Installation (Recommended)

```bash
npm install -g @techdebtgpt/pr-agent
```

### Option 2: From Source

```bash
git clone https://github.com/techdebtgpt/pr-agent.git
cd pr-agent
npm install --legacy-peer-deps
npm run build
```

## Configuration

### Claude Code

Add to your Claude Code settings:

```json
{
  "mcpServers": {
    "pr-agent": {
      "command": "pr-agent-mcp"
    }
  }
}
```

Or from source:

```json
{
  "mcpServers": {
    "pr-agent": {
      "command": "node",
      "args": ["dist/mcp/server.js"]
    }
  }
}
```

### Cursor / Cline / Windsurf

Same configuration format as Claude Code.

## Available Tools

### `analyze`

Main entry point - mirrors `pr-agent analyze` CLI command exactly.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `branch` | string | Base branch to compare (default: auto-detected) |
| `staged` | boolean | Analyze staged changes instead |
| `title` | string | PR title (auto-detected from git) |
| `cwd` | string | Working directory |
| `verbose` | boolean | Include debug info |
| `peerReview` | boolean | Enable Jira validation (uses config if not set) |
| `archDocs` | boolean | Include arch-docs context (uses config if not set) |

**Example:**
```
Analyze my current branch changes
```

### `dashboard`

Start the web dashboard - mirrors `pr-agent dashboard` CLI command.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `port` | number | Port to run on (default: 3000) |

**Example:**
```
Start the PR Agent dashboard
```

## Configuration File

The MCP server uses the same `.pragent.config.json` as the CLI:

```json
{
  "ai": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5-20250929"
  },
  "analysis": {
    "language": "typescript",
    "framework": "react",
    "enableStaticAnalysis": true
  },
  "git": {
    "defaultBranch": "origin/main"
  },
  "peerReview": {
    "enabled": true,
    "provider": "jira",
    "instanceUrl": "https://your-company.atlassian.net",
    "email": "your-email@company.com",
    "apiToken": "your-jira-api-token",
    "defaultProject": "PROJ"
  }
}
```

**Note**: The `ai.provider` and `apiKeys` sections are ignored by the MCP server since it's LLM-agnostic. The calling tool provides the AI.

## Output Format

The MCP server returns output formatted exactly like the CLI:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ PR Agent Analysis Complete!

📋 Summary

Title: Add new authentication system
Repository: owner/repo
Branch: feature/auth → origin/main
Files changed: 5
Lines: +234 / -45
Languages: TypeScript

📊 Complexity

Score: 3/5 - Moderate complexity - ensure thorough testing
Total changes: 279 lines
Files: 5
⚙️  Contains config changes

⚠️  Detected Risks

  1. 🔴 [CRITICAL] Potential hardcoded API key detected
  2. 🟡 [WARNING] Use of eval() detected - potential code injection risk

📁 Files Changed

  📝 src/auth/login.ts (+120/-20)
  📝 src/auth/logout.ts (+45/-10)
  ➕ src/auth/middleware.ts (+69/-0)
  📝 config/auth.json (+0/-15)

🎫 Linked Tickets

  • AUTH-123 (from branch, confidence: 85%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 INSTRUCTIONS FOR AI ANALYSIS:

Please analyze this PR and provide:
1. A brief summary of what the changes do
2. Potential risks or issues (bugs, edge cases, security)
3. Recommendations for improvement
4. Validation against linked ticket requirements (if Jira access available)

Format your response like the PR Agent CLI output shown above.
```

## Peer Review (Jira Integration)

If you have Jira configured in `.pragent.config.json`, the MCP server will:

1. **Extract ticket references** from PR title, branch name, and commits
2. **Report linked tickets** in the analysis output
3. **Enable peer review** validation by the calling LLM

The calling LLM can then use Jira MCP tools (if available) to:
- Fetch ticket details and acceptance criteria
- Validate implementation against requirements
- Provide senior-dev style verdict

## Architecture Documentation

If your repository has a `.arch-docs` folder, the MCP server will:

1. **Load all architecture documentation**
2. **Find relevant sections** based on changed files
3. **Include context** in the analysis output

This helps the calling LLM understand your codebase patterns.

## Web Dashboard

The dashboard shows:
- **PR analysis history**
- **Code quality trends**
- **ROI metrics**
- **Recent activity**

Data is stored in `pr-agent.db` (SQLite) - same database as CLI.

## Comparison: CLI vs MCP Server

| Feature | CLI | MCP Server |
|---------|-----|------------|
| Config file | `.pragent.config.json` | `.pragent.config.json` |
| Diff parsing | ✅ | ✅ |
| Risk detection | ✅ | ✅ |
| Complexity scoring | ✅ | ✅ |
| Arch-docs support | ✅ | ✅ |
| Jira ticket extraction | ✅ | ✅ |
| Dashboard | ✅ | ✅ |
| Database storage | ✅ | ✅ |
| AI analysis | Requires API key | Uses calling LLM |
| Peer review AI | Requires API key | Uses calling LLM |

## Troubleshooting

### MCP Server Not Starting

```bash
# Test manually
node dist/mcp/server.js

# Check for errors
pr-agent-mcp 2>&1
```

### Config Not Loading

The MCP server looks for `.pragent.config.json` in:
1. Current working directory
2. Parent directories (up to root)

### Dashboard Port in Use

```
Start the dashboard on port 3001
```

### No Changes Detected

Make sure you're in a git repository with uncommitted changes or on a branch that differs from the base branch.

## Publishing

### Publishing to npm

The MCP server is published as part of the `@techdebtgpt/pr-agent` npm package:

```bash
# Login to npm
npm login

# Publish (runs build automatically via prepublishOnly)
npm publish --access public
```

### Publishing to MCP Registry

The MCP Registry is the official directory for Model Context Protocol servers.

1. **Ensure `server.json` is valid** - Located in project root with proper schema
2. **Install the Publisher CLI**:
   ```bash
   brew install mcp-publisher  # macOS
   # Or download from releases
   ```
3. **Authenticate with GitHub**:
   ```bash
   mcp-publisher login github
   ```
4. **Publish**:
   ```bash
   mcp-publisher publish
   ```

The `mcpName` field in `package.json` (`io.github.techdebtgpt/pr-agent`) enables automatic registry validation.

### Publishing to Smithery

[Smithery](https://smithery.ai) is a marketplace for MCP servers.

1. **Connect your GitHub repository** at smithery.ai
2. **Ensure `smithery.json` exists** in project root
3. **Start a deployment** from the Smithery dashboard
4. Your server becomes discoverable at smithery.ai

### Automatic Installation

Once published, users can install via:

**Smithery:**
```bash
smithery install @techdebtgpt/pr-agent
```

**npx (direct):**
```bash
npx -y @techdebtgpt/pr-agent mcp
```

**Manual configuration:**
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

## Security Considerations

Following MCP best practices:

- **No external API calls** - Server runs locally, LLM-agnostic
- **Credential safety** - Config files stay local, use env vars for secrets
- **Tool annotations** - `readOnlyHint: true` on analyze tool
- **Input validation** - All parameters validated with Zod schemas
- **Secure defaults** - Dashboard binds to localhost only

## License

Apache-2.0 License - see [LICENSE](../LICENSE) for details.
