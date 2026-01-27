Subject: MCP Server Integration PR Ready for Review

Hi team,

I've created a pull request for the MCP Server integration on the upstream repo:

PR: https://github.com/techdebtgpt/pr-agent/pull/30


What's Done:

The MCP server lets you run PR Agent directly in Claude Code without API keys. I've thoroughly tested it for backward compatibility with the existing CLI tool and done an extensive refactor to support both modes.

Installation instructions are in the PR description and README. Refactoring documentation is in the project docs.


What's Left:

Two main things:

1. Output formatting - Making the MCP output match the CLI format (bit tricky due to the architecture differences)

2. Multi-tool testing - So far only tested with Claude. Need to verify with Cursor and other AI tools.


Next Steps:

Feel free to review when you have time. Happy to answer any questions or walk through anything in more detail.

Thanks!


Links:
• Upstream PR: https://github.com/techdebtgpt/pr-agent/pull/30
• Fork PR: https://github.com/dzdimov/PeeR-Agent/pull/18
