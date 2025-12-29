import chalk from 'chalk';
/**
 * Display comprehensive help information for PR Agent
 */
export function displayHelp() {
    console.log(chalk.bold.cyan('\n🤖  PR Agent - AI-Powered Pull Request Analyzer\n'));
    console.log(chalk.dim('Analyze pull requests and code changes with AI to identify risks, complexity, and provide insights.\n'));
    // Quick Start
    console.log(chalk.bold.yellow('📖 QUICK START\n'));
    console.log(chalk.green('  1. Setup:') + '         pr-agent config --init');
    console.log(chalk.green('  2. Analyze:') + '       pr-agent analyze');
    console.log(chalk.green('  3. Custom:') + '        pr-agent analyze --branch develop --full\n');
    // Main Commands
    console.log(chalk.bold.yellow('🚀 COMMANDS\n'));
    // Analyze command
    console.log(chalk.bold('  analyze'));
    console.log('    Analyze pull request changes with AI\n');
    console.log(chalk.dim('    Examples:'));
    console.log('      pr-agent analyze                         # Analyze against origin/main');
    console.log('      pr-agent analyze --staged                # Analyze staged changes');
    console.log('      pr-agent analyze --branch develop        # Analyze against develop');
    console.log('      pr-agent analyze --file diff.txt         # Analyze from file');
    console.log('      pr-agent analyze --full                  # Full analysis (all modes)\n');
    console.log(chalk.dim('    Analysis Modes:'));
    console.log('      --summary              Show summary only');
    console.log('      --risks                Show risks only');
    console.log('      --complexity           Show complexity only');
    console.log('      --full                 Show all (default)\n');
    console.log(chalk.dim('    Diff Sources:'));
    console.log('      --staged               Analyze staged changes (git diff --staged)');
    console.log('      --branch <name>        Analyze against specific branch');
    console.log('      --file <path>          Read diff from file');
    console.log('      --diff <text>          Provide diff directly\n');
    console.log(chalk.dim('    Default Branch Detection:'));
    console.log('      The default branch is determined in this order:');
    console.log('      1. Config file (git.defaultBranch)');
    console.log('      2. GitHub API (if GITHUB_TOKEN is set)');
    console.log('      3. Git commands (local detection)');
    console.log('      4. Fallback to origin/main');
    console.log('      Use --branch to override for a single analysis\n');
    console.log(chalk.dim('    Advanced Options:'));
    console.log('      --provider <provider>  AI provider: anthropic|openai|google|zhipu');
    console.log('      --model <model>        Specific model to use');
    console.log('      --title <text>         PR title (auto-detected from git)');
    console.log('      --max-cost <dollars>   Maximum cost limit (default: $5.00)');
    console.log('      --verbose              Enable verbose output\n');
    // Config command
    console.log(chalk.bold('  config'));
    console.log('    Manage PR Agent configuration\n');
    console.log(chalk.dim('    Examples:'));
    console.log('      pr-agent config --init               # Interactive setup wizard');
    console.log('      pr-agent config --list               # Show current configuration');
    console.log('      pr-agent config --validate           # Validate configuration\n');
    console.log(chalk.dim('    Options:'));
    console.log('      --init                 Run interactive configuration wizard');
    console.log('      --list                 Display current configuration');
    console.log('      --get <key>            Get specific value (e.g., ai.model)');
    console.log('      --set <key=value>      Set specific value (e.g., ai.temperature=0.5)');
    console.log('      --validate             Validate configuration file');
    console.log('      --reset                Reset configuration to defaults\n');
    // Help command
    console.log(chalk.bold('  help'));
    console.log('    Display this comprehensive help information\n');
    // Analysis Modes Detail
    console.log(chalk.bold.yellow('📊 ANALYSIS MODES\n'));
    console.log(chalk.green('  Summary') + '      - Overview of changes, impact assessment, and key modifications');
    console.log(chalk.green('  Risks') + '        - Potential issues, security concerns, and breaking changes');
    console.log(chalk.green('  Complexity') + '   - Complexity score (1-5) and maintainability assessment');
    console.log(chalk.green('  Full') + '         - All of the above (default mode)\n');
    // Intelligent Agent
    console.log(chalk.bold.yellow('🧠 INTELLIGENT AGENT\n'));
    console.log('  The PR Agent automatically uses an intelligent agent for large diffs (>50KB).');
    console.log('  The agent provides:\n');
    console.log('  • ' + chalk.cyan('File-level analysis') + ' with individual risk and complexity scores');
    console.log('  • ' + chalk.cyan('Strategic reasoning') + ' about analysis approach');
    console.log('  • ' + chalk.cyan('Contextual recommendations') + ' based on changes');
    console.log('  • ' + chalk.cyan('No chunking required') + ' - handles large diffs intelligently\n');
    // Environment Variables
    console.log(chalk.bold.yellow('🔑 ENVIRONMENT VARIABLES\n'));
    console.log('  API Keys:');
    console.log('    ANTHROPIC_API_KEY       Anthropic Claude API key (required for Claude)');
    console.log('    OPENAI_API_KEY          OpenAI GPT API key (required for OpenAI)');
    console.log('    GOOGLE_API_KEY          Google Gemini API key (required for Gemini)\n');
    console.log(chalk.dim('  Note: API keys can also be stored in .pragent.config.json\n'));
    // Configuration File
    console.log(chalk.bold.yellow('📝 CONFIGURATION FILE\n'));
    console.log('  Location: ' + chalk.cyan('.pragent.config.json') + ' (root directory)');
    console.log('  Create:   ' + chalk.cyan('pr-agent config --init\n'));
    console.log(chalk.dim('  Example structure:'));
    console.log(chalk.dim(`  {
    "ai": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-5-20250929",
      "temperature": 0.2,
      "maxTokens": 2000
    },
    "apiKeys": {
      "anthropic": "sk-ant-..."
    },
    "analysis": {
      "defaultMode": "full",
      "maxCost": 5.0,
      "autoDetectAgent": true
    },
    "git": {
      "defaultBranch": "origin/main",
      "includeUntracked": true
    }
  }\n`));
    // Supported Providers
    console.log(chalk.bold.yellow('🌐 SUPPORTED AI PROVIDERS\n'));
    console.log(chalk.green('  Anthropic Claude') + ' (Recommended)');
    console.log('    • claude-sonnet-4-5-20250929 (default)');
    console.log('    • claude-3-5-sonnet-20241022');
    console.log('    • claude-3-opus-20240229\n');
    console.log(chalk.green('  OpenAI GPT'));
    console.log('    • gpt-5.1 (latest)');
    console.log('    • gpt-4-turbo-preview');
    console.log('    • gpt-4');
    console.log('    • gpt-3.5-turbo\n');
    console.log(chalk.green('  Google Gemini'));
    console.log('    • gemini-pro');
    console.log('    • gemini-ultra\n');
    // Common Workflows
    console.log(chalk.bold.yellow('💡 COMMON WORKFLOWS\n'));
    console.log(chalk.bold('  First-time setup:'));
    console.log('    1. pr-agent config --init');
    console.log('    2. pr-agent analyze\n');
    console.log(chalk.bold('  Quick PR review:'));
    console.log('    pr-agent analyze --full\n');
    console.log(chalk.bold('  Review staged changes before commit:'));
    console.log('    pr-agent analyze --staged\n');
    console.log(chalk.bold('  Compare feature branch:'));
    console.log('    git checkout feature-branch');
    console.log('    pr-agent analyze --branch develop\n');
    console.log(chalk.bold('  Analyze diff from file:'));
    console.log('    git diff > changes.diff');
    console.log('    pr-agent analyze --file changes.diff\n');
    console.log(chalk.bold('  Large PR analysis:'));
    console.log('    pr-agent analyze --verbose\n');
    console.log(chalk.bold('  Custom provider:'));
    console.log('    pr-agent analyze --provider openai --model gpt-4-turbo-preview\n');
    // CI/CD Integration
    console.log(chalk.bold.yellow('🔄 CI/CD INTEGRATION\n'));
    console.log(chalk.bold('  GitHub Actions:'));
    console.log(chalk.dim('    - name: Analyze PR'));
    console.log(chalk.dim('      run: |'));
    console.log(chalk.dim('        npm install -g pr-agent'));
    console.log(chalk.dim('        pr-agent analyze --full'));
    console.log(chalk.dim('      env:'));
    console.log(chalk.dim('        ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}\n'));
    console.log(chalk.bold('  GitLab CI:'));
    console.log(chalk.dim('    analyze-pr:'));
    console.log(chalk.dim('      script:'));
    console.log(chalk.dim('        - npm install -g pr-agent'));
    console.log(chalk.dim('        - pr-agent analyze --full\n'));
    // Tips & Best Practices
    console.log(chalk.bold.yellow('✨ TIPS & BEST PRACTICES\n'));
    console.log('  • Use ' + chalk.cyan('--verbose') + ' for detailed analysis output');
    console.log('  • Set ' + chalk.cyan('--max-cost') + ' to control API spending on large PRs');
    console.log('  • Use ' + chalk.cyan('--staged') + ' to review changes before committing');
    console.log('  • Store API keys in ' + chalk.cyan('.pragent.config.json') + ' and add to .gitignore');
    console.log('  • Use ' + chalk.cyan('--verbose') + ' to see detailed reasoning and strategy');
    console.log('  • Configure ' + chalk.cyan('defaultMode') + ' in config for your team\'s workflow\n');
    // Footer
    console.log(chalk.dim('━'.repeat(80)));
    console.log(chalk.dim('  For detailed help on a specific command: ') + chalk.cyan('pr-agent <command> --help'));
    console.log(chalk.dim('  Report issues: ') + chalk.cyan('https://github.com/your-org/pr-agent/issues'));
    console.log(chalk.dim('━'.repeat(80) + '\n'));
}
/**
 * Register help command with Commander
 */
export function registerHelpCommand(program) {
    program
        .command('help')
        .description('Display comprehensive help information')
        .action(() => {
        displayHelp();
    });
}
//# sourceMappingURL=help.command.js.map