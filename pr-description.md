# 🚀 LLM-Agnostic MCP Server with Peer Review Integration

## 📋 Overview

This PR implements a comprehensive MCP (Model Context Protocol) server for PR Agent that enables AI-powered PR analysis directly in Claude Code, Cursor, and other MCP-compatible editors **without requiring API keys upfront**.

## ✨ Key Features

### 🤖 LLM-Agnostic Architecture
- **Static Analysis First**: Provides immediate value without API calls
  - Project classification (business logic, infra, data pipeline)
  - Test suggestions with framework detection
  - DevOps cost estimates (AWS resources)
  - Test coverage integration (Jest, Pytest, etc.)
- **Prompt Generation**: Returns structured prompts for the calling LLM to execute
- **Flexible Execution**: Works with any LLM provider through the calling agent

### 🎯 Peer Review Integration
- **Jira Ticket Validation**: Automatically detects and validates against Jira tickets
- **Acceptance Criteria Checking**: Validates implementation completeness
- **Ticket Quality Assessment**: Rates ticket quality and provides feedback
- **Senior Dev Review**: Provides blockers, warnings, and recommendations

### 📊 Auto-Start Dashboard
- **Automatic Launch**: Dashboard auto-starts at http://localhost:3000 after analysis
- **Results Persistence**: All analysis results saved to local SQLite database
- **History Tracking**: View past analyses, trends, and ROI metrics

## 🔧 Installation Instructions for Team Members

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- Claude Code CLI installed

### Step 1: Install PR Agent Package

```bash
# Install globally from npm
npm install -g @techdebtgpt/pr-agent

# Or install locally in your project
npm install --save-dev @techdebtgpt/pr-agent
```

### Step 2: Configure MCP Server in Claude Code

Add the PR Agent MCP server to your Claude Code configuration:

**Location**: `~/.claude/config.json` (or `%APPDATA%\Claude\config.json` on Windows)

```json
{
  "mcpServers": {
    "pr-agent": {
      "command": "npx",
      "args": ["@techdebtgpt/pr-agent", "mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Alternative**: If installed globally:
```json
{
  "mcpServers": {
    "pr-agent": {
      "command": "pr-agent",
      "args": ["mcp"]
    }
  }
}
```

### Step 3: Create Configuration File

In your repository root, create `.pragent.config.json`:

```json
{
  "ai": {
    "provider": "anthropic",
    "model": "claude-sonnet-4"
  },
  "git": {
    "defaultBranch": "main"
  },
  "analysis": {
    "enableStaticAnalysis": true,
    "language": "typescript",
    "framework": "react"
  },
  "peerReview": {
    "enabled": true,
    "useMcp": true,
    "instanceUrl": "https://your-org.atlassian.net",
    "defaultProject": "PROJ"
  }
}
```

### Step 4: Configure API Keys (Optional)

Set your preferred AI provider API key:

```bash
# For Anthropic Claude
export ANTHROPIC_API_KEY="your-api-key"

# For OpenAI GPT
export OPENAI_API_KEY="your-api-key"

# For Google Gemini
export GOOGLE_API_KEY="your-api-key"

# For Zhipu GLM
export ZHIPU_API_KEY="your-api-key"
```

Or add to your `.pragent.config.json`:
```json
{
  "apiKeys": {
    "anthropic": "your-api-key-here"
  }
}
```

### Step 5: Restart Claude Code

After adding the MCP server configuration:
1. Quit Claude Code completely
2. Restart Claude Code
3. The MCP server will automatically load

### Step 6: Test the Integration

In Claude Code, try these commands:
```
Analyze the current branch with peer review enabled
```

or in any repository:
```
Run PR Agent MCP analyze on this branch
```

## 📖 Usage Examples

### Basic Analysis
```
Analyze this PR against main branch
```

### With Peer Review (Jira Integration)
```
Analyze branch feature/TODO-123 with peer review enabled
```

### View Results Dashboard
```
Start the PR Agent dashboard
```

## 🎯 Available MCP Tools

The MCP server exposes three tools:

### 1. `analyze`
Analyzes PR/branch changes with static analysis and LLM prompts.

**Parameters:**
- `branch` (optional): Base branch to compare against
- `staged` (optional): Analyze staged changes instead
- `title` (optional): PR title (auto-detected from git)
- `cwd` (optional): Working directory
- `verbose` (optional): Include debug information
- `peerReview` (optional): Enable Jira peer review
- `archDocs` (optional): Include architecture docs

### 2. `saveAnalysisResults`
Saves analysis results to the database after LLM execution.

**Parameters:**
- `title`, `complexity`, `risks`, `recommendations` (required)
- `peerReviewEnabled`, `ticketKey`, `ticketQualityScore` (optional)
- Plus other peer review metrics

### 3. `dashboard`
Starts the web dashboard on localhost.

**Parameters:**
- `port` (optional): Port to run on (default: 3000)

## 🏗️ Architecture Changes

### Current Implementation (PROMPT_ONLY Mode)
```typescript
// MCP Server returns prompts for calling LLM to execute
const agent = new PRAnalyzerAgent({ mode: ExecutionMode.PROMPT_ONLY });
const result = await agent.analyze(diff, title, mode);
// Returns: { mode: 'prompt_only', prompts: [...] }
```

### Planned Enhancement (EXECUTE Mode)
```typescript
// MCP Server executes analysis internally (like CLI)
const agent = new PRAnalyzerAgent({
  mode: ExecutionMode.EXECUTE,
  provider: config.ai.provider,
  apiKey: getApiKey(config.ai.provider)
});
const result = await agent.analyze(diff, title, mode);
// Returns: { mode: 'execute', summary, risks, complexity, ... }
```

## 🔄 Migration Path

### Phase 1: PROMPT_ONLY Mode (Current)
- ✅ Static analysis (no LLM needed)
- ✅ Returns prompts for calling LLM
- ✅ Dashboard auto-start
- ⚠️ Manual prompt execution required
- ⚠️ No automatic database saving

### Phase 2: EXECUTE Mode (Future)
- ✅ Static analysis (no LLM needed)
- ✅ Internal LLM execution
- ✅ Unified Markdown output (like CLI)
- ✅ Automatic database saving
- ✅ Dashboard auto-start

## 🧪 Testing

Tested on:
- ✅ todo-ai-agents repository (feature/TODO-2-due-dates branch)
- ✅ peer-agent repository (current branch)
- ✅ Static analysis without API keys
- ✅ Peer review prompt generation
- ✅ Dashboard auto-start

## 📊 Output Format

### Static Analysis (Immediate, No LLM)
```markdown
## 📊 Static Analysis Results

### 🏗️ Project Classification
**Type:** 💼 Business Logic
**Confidence:** 100%

### 🧪 Test Suggestions (7)
[Generated test templates for each modified file]

### 💰 DevOps Cost Estimates (~$25.50/month)
[AWS resource cost breakdown]

### 📈 Test Coverage Report
- Overall: 78.5%
- Lines: 82.1%
- Branches: 71.3%
```

### LLM Analysis Prompts
```markdown
## 🤖 LLM Analysis Prompts

### Step 1: File Analysis
[Structured prompt with diff context]

### Step 2: Risk Detection
[Structured prompt for security/quality issues]

### Step 3: Summary Generation
[Structured prompt for PR summary]

### Step 4: Ticket Quality Assessment
[Jira ticket quality evaluation]

### Step 5: AC Validation
[Acceptance criteria coverage check]

### Step 6: Peer Review
[Senior dev style review with verdict]
```

## 🔗 Related Links

- **npm Package**: https://www.npmjs.com/package/@techdebtgpt/pr-agent
- **GitHub Repository**: https://github.com/dzdimov/PeeR-Agent
- **MCP Documentation**: https://modelcontextprotocol.io

## 📝 Breaking Changes

None. This is a new feature addition that does not affect existing CLI functionality.

## 🚀 Next Steps

1. **Review and Merge**: Review the implementation and merge to main
2. **Publish to npm**: Update package version and publish
3. **Team Rollout**: Share installation instructions with team
4. **Feedback Collection**: Gather feedback on MCP integration
5. **EXECUTE Mode**: Implement full LLM execution in MCP server

## 🤝 For Reviewers

### Key Files to Review
- `src/mcp/server.ts` - Main MCP server implementation
- `src/types/agent.types.ts` - Type definitions for modes
- `src/agents/base-pr-agent-workflow.ts` - PROMPT_ONLY mode support

### Testing Checklist
- [ ] MCP server starts without errors
- [ ] Static analysis works without API keys
- [ ] Prompts are generated correctly
- [ ] Dashboard auto-starts at localhost:3000
- [ ] Peer review integration works with Jira
- [ ] Configuration respects all settings

## 📞 Support

For issues or questions:
- **GitHub Issues**: https://github.com/dzdimov/PeeR-Agent/issues
- **Team Slack**: #pr-agent-support

---

**Co-Authored-By**: Claude Sonnet 4.5 <noreply@anthropic.com>
