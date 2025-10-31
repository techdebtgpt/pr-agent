# PR Agent

An AI-powered GitHub Action that automatically analyzes pull requests using Claude AI and provides intelligent code review insights, risk assessments, and complexity ratings.

🎥 [Watch the setup tutorial on YouTube](https://youtu.be/jCdFwLJIzEU)

## Overview

PR Agent analyzes your pull requests and provides:
- **Summary**: Clear description of what the change does and its purpose
- **Potential Risks**: Identification of possible bugs, edge cases, or issues
- **Complexity Rating**: A 1-5 scale rating of the PR's complexity
- **Actionable Insights**: Specific recommendations for reviewers

## Prerequisites

Before setting up PR Agent in your project, you'll need:

1. **Anthropic API Key**: Sign up at [Anthropic Console](https://console.anthropic.com/) to get your API key
2. **GitHub Repository**: With permissions to add workflows and secrets

## Setup Instructions

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

Add your Anthropic API key to your repository secrets:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `ANTHROPIC_API_KEY`
5. Value: Your Anthropic API key
6. Click **Add secret**

> **Note**: `GITHUB_TOKEN` is automatically provided by GitHub Actions, no manual setup required.

## Usage

### Automatic Analysis

Once set up, PR Agent automatically runs on:
- New pull requests (`opened`)
- Updates to existing pull requests (`synchronize`)
- Reopened pull requests (`reopened`)

### What Happens

1. **PR Opened/Updated**: When a PR is created or updated, the workflow triggers
2. **Fetch Changes**: The action retrieves all file changes (diffs) from the PR
3. **AI Analysis**: Sends the diff to Claude AI for analysis
4. **Post Comment**: Posts a comprehensive analysis comment on the PR

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

## Development Setup

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
npm run build:action
```
Creates the `dist/` directory that is neccessary for the build to run

### 4. Test Locally

To test the action locally, you can:

1. Set environment variables:
   ```bash
   ANTHROPIC_API_KEY="your-api-key"
   ```

2. Create a test PR in a repository you own
3. Run the action (requires GitHub Actions context)

## Project Structure

```
pr-agent/
├── src/
│   ├── action.ts      # Main GitHub Action entry point
│   ├── analyzer.ts    # Claude AI integration
│   ├── types.ts       # TypeScript type definitions
│   └── index.ts       # Additional exports
├── dist/              # Compiled JavaScript (generated)
├── action.yml         # GitHub Action configuration
├── .pr-analyzer.yml   # PR Analyzer file configuration
├── package.json       # Node.js dependencies
├── tsconfig.json      # TypeScript configuration
└── README.md          # This file
```

## How It Works

1. **Workflow Setup**: The `.github/workflows/pr-analyzer.yml` file defines when and how PR Agent runs
2. **Trigger**: GitHub Action triggers automatically on PR events (`opened`, `synchronize`, `reopened`)
3. **Fetch Diffs**: Uses GitHub API to retrieve all changed files and their diffs
4. **Prepare Prompt**: Constructs a detailed prompt with the PR title and diffs
5. **AI Analysis**: Sends to Claude 3.5 Sonnet for analysis
6. **Parse Response**: Extracts structured insights from Claude's response
7. **Post Comment**: Creates a formatted comment on the PR using GitHub API

## Troubleshooting

### Action Not Running

- Verify the workflow file `.github/workflows/pr-analyzer.yml` exists and is committed to your repository
- Check that the workflow file is in the correct location (`.github/workflows/` directory)
- Verify workflow triggers match PR events (`opened`, `synchronize`, `reopened`)
- Ensure repository permissions allow Actions to run (check repository Settings → Actions → General)
- Check if Actions are enabled for your repository

### No Comments Posted

- Verify `ANTHROPIC_API_KEY` secret is set correctly
- Check workflow permissions include `pull-requests: write`
- Review Action logs for error messages

### Analysis Failed

- Check if your Anthropic API key is valid and has available credits
- Verify the API key has not expired
- Review Action logs for detailed error messages

### Large PRs

- For very large PRs, the diff might exceed token limits
- Consider breaking large PRs into smaller, focused changes
- Future versions will include diff size limits and chunking


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

## Roadmap

Planned features:
- [x] Configuration file support (`.pr-analyzer.yml`)
- [ ] Customizable analysis prompts
- [ ] Support for multiple AI providers
- [ ] Diff size limits and smart chunking
- [ ] File-level analysis comments
- [ ] Security vulnerability detection
- [ ] Performance impact analysis
- [ ] Custom analysis rules
