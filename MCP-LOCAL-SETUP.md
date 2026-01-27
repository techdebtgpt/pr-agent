# MCP Server - Local Development Setup

> **Important Architecture Note**: PR Agent is primarily a **CLI tool** for analyzing pull requests. The MCP server (located in `src/mcp/`) is an additional component that exposes the same analysis functionality via the Model Context Protocol. The MCP server imports and reuses the CLI's core `PRAnalyzerAgent` and analysis tools.

This guide helps you set up and demo the PR Agent MCP server when working with this repository.

## Project Structure

```
pr-agent/                     # Primary: CLI tool for PR analysis
├── src/
│   ├── cli/                  # CLI commands (pr-agent)
│   ├── agents/               # Core analysis engine (PRAnalyzerAgent)
│   ├── tools/                # Analysis tools (diff parsing, risk detection)
│   └── mcp/                  # MCP server component
│       └── server.ts         # MCP server that imports CLI functionality
├── dist/
│   ├── cli/index.js          # Built CLI (bin: pr-agent)
│   └── mcp/server.js         # Built MCP server (bin: pr-agent-mcp)
├── .mcp.json                 # Project-wide MCP config (Claude Code, Cursor, etc.)
├── .vscode/mcp.json          # VS Code + GitHub Copilot MCP config
└── server.json               # MCP server manifest (tool schemas)
```

## MCP Server Tools

The PR Agent MCP server provides two tools (see `server.json` for full schemas):

1. **`analyze`** - Analyze PR/branch changes
   - Parses git diff
   - Detects security risks, code quality issues
   - Calculates complexity scores
   - Extracts Jira ticket references
   - Includes architecture documentation context

2. **`dashboard`** - Start web dashboard
   - View analysis history
   - Code quality trends
   - ROI metrics

## Required MCP Servers for Full Functionality

The PR Agent MCP server works best when combined with these official MCP servers:

### 1. Atlassian MCP Server (For Jira Integration)
**What it does**: The PR Agent extracts Jira ticket IDs (e.g., `PROJ-123`) from PR titles, branch names, and commits. The Atlassian MCP server then fetches the actual ticket details, acceptance criteria, and requirements.

**Installation**: Already configured in `.mcp.json`. Claude Code will prompt you to enable it on first use.

**Configuration**: You'll need Jira credentials. See [Atlassian MCP Server docs](https://github.com/modelcontextprotocol/servers/tree/main/src/atlassian).

### 2. GitHub MCP Server (For Repository Management)
**What it does**: Provides GitHub API access for repository management, PR operations, and more.

**Installation**: Already configured in `.mcp.json`. Claude Code will prompt you to enable it on first use.

**Configuration**: Requires GitHub authentication. See [GitHub MCP Server docs](https://github.com/modelcontextprotocol/servers/tree/main/src/github).

### How They Work Together

```
User: "Analyze my PR changes"
  ↓
PR Agent MCP Server:
  - Parses git diff
  - Detects risks and complexity
  - Extracts "PROJ-123" from branch name
  - Returns analysis with ticket ID
  ↓
Claude Code (via Atlassian MCP):
  - Fetches PROJ-123 details from Jira
  - Validates PR against acceptance criteria
  - Provides comprehensive review
```

## Quick Start (For Colleagues & Contributors)

### 1. Clone and Build

```bash
git clone https://github.com/techdebtgpt/pr-agent.git
cd pr-agent
npm install --legacy-peer-deps
npm run build
```

### 2. Configure Your MCP Client

#### Option A: Claude Code (Recommended)

1. Find your Claude Code settings file:
   - **Windows**: `%USERPROFILE%\.claude\settings.json`
   - **macOS/Linux**: `~/.claude/settings.json`

2. Add the MCP server configuration:

```json
{
  "mcpServers": {
    "pr-agent": {
      "command": "node",
      "args": ["C:/Repos/peer-agent/dist/mcp/server.js"]
    }
  }
}
```

**Important**: Replace `C:/Repos/peer-agent` with the absolute path to your cloned repository.

3. Restart Claude Code

#### Option B: Cursor / Windsurf / Other MCP Clients

Add to your MCP configuration file (location varies by client):

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

### 3. Verify Installation

In your MCP client (e.g., Claude Code), you should now see the PR Agent tools available:
- `analyze` - Analyze PR/branch changes
- `dashboard` - Start the web dashboard

### 4. Test It Out

Open a git repository with changes and ask your AI assistant:
```
Analyze my current branch changes
```

The MCP server will parse the diff, detect risks, calculate complexity, and return a formatted analysis.

## Project Structure

```
pr-agent/
├── src/
│   └── mcp/
│       ├── server.ts          # MCP server implementation
│       └── stub-chat-model.ts # Stub model for LLM-agnostic operation
├── dist/
│   └── mcp/
│       └── server.js          # Built MCP server (run this)
├── .mcp.json.example          # Example MCP config (copy and customize)
├── server.json                # MCP server manifest (for publishing)
└── docs/
    └── MCP-SERVER.md          # Full MCP documentation
```

## Configuration File (.pragent.config.json)

The MCP server uses the same configuration as the CLI. Create `.pragent.config.json` in your project root:

```json
{
  "git": {
    "defaultBranch": "origin/main"
  },
  "analysis": {
    "language": "typescript",
    "framework": "react",
    "enableStaticAnalysis": true
  },
  "peerReview": {
    "enabled": false
  }
}
```

> **Note**: The MCP server is LLM-agnostic, so AI provider settings (`ai.provider`, `apiKeys`) are ignored.

## Available Tools

### analyze
Analyzes PR/branch changes with comprehensive diff parsing, risk detection, and complexity scoring.

**Example prompts:**
- "Analyze my current branch changes"
- "Analyze staged changes"
- "Analyze changes against origin/develop"

### dashboard
Starts a local web dashboard for viewing analysis history and metrics.

**Example prompts:**
- "Start the PR Agent dashboard"
- "Start the dashboard on port 3001"

## Troubleshooting

### MCP Server Not Starting

1. **Check the build**: Ensure `npm run build` completed successfully
2. **Test manually**: Run `node dist/mcp/server.js` and check for errors
3. **Check Node version**: Requires Node.js >=18.0.0

```bash
# Test manually
node dist/mcp/server.js

# Check Node version
node --version
```

### Config Path Issues

Make sure you use the **absolute path** to the repository in your MCP configuration:

**Wrong** (relative path):
```json
"args": ["./dist/mcp/server.js"]
```

**Correct** (absolute path):
```json
"args": ["C:/Repos/peer-agent/dist/mcp/server.js"]
```

### Changes Not Being Built

After making changes to the MCP server code, rebuild:

```bash
npm run build
```

Then restart your MCP client (e.g., Claude Code).

### Database Location

Analysis data is stored in `pr-agent.db` (SQLite) in the working directory where the MCP server runs. You can view this data using the dashboard.

## Development Workflow

1. **Make changes** to `src/mcp/server.ts`
2. **Rebuild**: `npm run build`
3. **Restart** your MCP client
4. **Test** using an AI prompt

## Demo for Team Members

To demo the MCP server to your team:

1. **Build the project** (see Quick Start above)
2. **Configure Claude Code** with the local MCP server
3. **Open a git repository** with some changes
4. **Ask Claude Code**: "Analyze my current branch changes"
5. **Show the dashboard**: "Start the PR Agent dashboard"

The analysis will show:
- Summary of changed files and lines
- Complexity score (1-5)
- Detected risks (security, quality, breaking changes)
- File-by-file breakdown
- Linked Jira tickets (if configured)
- Architecture documentation context (if `.arch-docs` exists)

## Publishing (For Maintainers)

### To npm

```bash
npm login
npm publish --access public
```

### To Smithery

1. Connect repository at https://smithery.ai
2. Start deployment from dashboard
3. Server becomes discoverable

See [docs/MCP-SERVER.md](docs/MCP-SERVER.md) for full publishing details.

## Additional Resources

- [Full MCP Documentation](docs/MCP-SERVER.md)
- [CLI Documentation](README.md)
- [CLAUDE.md](CLAUDE.md) - Project overview for Claude Code
- [Model Context Protocol](https://modelcontextprotocol.io/)

## Support

For issues or questions:
- Open an issue: https://github.com/techdebtgpt/pr-agent/issues
- Check existing docs: [docs/MCP-SERVER.md](docs/MCP-SERVER.md)
