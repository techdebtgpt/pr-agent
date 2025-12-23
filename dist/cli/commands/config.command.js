import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
const CONFIG_FILE = '.pragent.config.json';
const DEFAULT_CONFIG = {
    apiKeys: {
        anthropic: '',
        openai: '',
        google: '',
    },
    ai: {
        provider: 'claude',
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.2,
        maxTokens: 2000,
    },
    analysis: {
        defaultMode: 'full',
        maxCost: 5.0,
        autoDetectAgent: true,
        agentThreshold: 50000, // bytes
        language: 'typescript',
        framework: '',
        enableStaticAnalysis: true,
    },
    git: {
        defaultBranch: 'origin/main',
        includeUntracked: true,
        excludePatterns: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/.git/**',
            '**/*.min.js',
            '**/*.map',
            '**/*.d.ts',
        ],
    },
    output: {
        verbose: false,
        showStrategy: true,
        showRecommendations: true,
    },
};
/**
 * Find existing config file in root directory only
 */
function findConfigPath() {
    const rootConfig = path.join(process.cwd(), CONFIG_FILE);
    if (fs.existsSync(rootConfig)) {
        return rootConfig;
    }
    return null;
}
/**
 * Initialize configuration with interactive setup
 */
async function initializeConfig() {
    console.log(chalk.cyan.bold('🚀 Welcome to PR Agent Setup!\n'));
    const projectPath = process.cwd();
    const configPath = path.join(projectPath, CONFIG_FILE);
    // Check if config already exists
    const existingConfig = fs.existsSync(configPath)
        ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        : null;
    if (existingConfig) {
        console.log(chalk.yellow('⚠️  Found existing configuration:\n'));
        console.log(`   Provider: ${existingConfig.ai?.provider || 'Not set'}`);
        console.log(`   Model: ${existingConfig.ai?.model || 'Not set'}`);
        console.log(`   Default Mode: ${existingConfig.analysis?.defaultMode || 'full'}\n`);
        const { shouldUpdate } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'shouldUpdate',
                message: 'Update configuration?',
                default: true,
            },
        ]);
        if (!shouldUpdate) {
            console.log(chalk.gray('Setup cancelled.'));
            return;
        }
        console.log(chalk.cyan('Updating configuration...\n'));
    }
    else {
        console.log(chalk.gray(`Creating configuration in: ${CONFIG_FILE}\n`));
    }
    // Provider selection
    const { provider } = await inquirer.prompt([
        {
            type: 'list',
            name: 'provider',
            message: 'Select AI provider:',
            choices: [
                { name: 'Anthropic Claude (Recommended)', value: 'anthropic' },
                { name: 'OpenAI GPT', value: 'openai' },
                { name: 'Google Gemini', value: 'google' },
            ],
            default: 'anthropic',
        },
    ]);
    // Model selection based on provider
    let modelChoices = [];
    if (provider === 'anthropic') {
        modelChoices = [
            { name: 'Claude Sonnet 4.5 (Recommended)', value: 'claude-sonnet-4-5-20250929' },
            { name: 'Claude Sonnet 3.5', value: 'claude-3-5-sonnet-20241022' },
            { name: 'Claude Opus', value: 'claude-3-opus-20240229' },
        ];
    }
    else if (provider === 'openai') {
        modelChoices = [
            { name: 'GPT-5.1 (Latest)', value: 'gpt-5.1' },
            { name: 'GPT-4 Turbo', value: 'gpt-4-turbo-preview' },
            { name: 'GPT-4', value: 'gpt-4' },
            { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
        ];
    }
    else if (provider === 'google') {
        modelChoices = [
            { name: 'Gemini Pro', value: 'gemini-pro' },
            { name: 'Gemini Ultra', value: 'gemini-ultra' },
        ];
    }
    const { model } = await inquirer.prompt([
        {
            type: 'list',
            name: 'model',
            message: 'Select model:',
            choices: modelChoices,
        },
    ]);
    // API key input
    const { apiKey, saveApiKey } = await inquirer.prompt([
        {
            type: 'password',
            name: 'apiKey',
            message: `Enter ${provider.toUpperCase()} API key (or leave empty to use environment variable):`,
            mask: '*',
        },
        {
            type: 'confirm',
            name: 'saveApiKey',
            message: 'Save API key to config file? (will be added to .gitignore)',
            default: false,
            when: (answers) => !!answers.apiKey,
        },
    ]);
    // Analysis preferences
    const { defaultMode, autoDetectAgent, language, framework, enableStaticAnalysis } = await inquirer.prompt([
        {
            type: 'list',
            name: 'defaultMode',
            message: 'Default analysis mode:',
            choices: [
                { name: 'Full (summary + risks + complexity)', value: 'full' },
                { name: 'Summary only', value: 'summary' },
                { name: 'Risks only', value: 'risks' },
                { name: 'Complexity only', value: 'complexity' },
            ],
            default: 'full',
        },
        {
            type: 'confirm',
            name: 'autoDetectAgent',
            message: 'Auto-detect when to use intelligent agent for large diffs?',
            default: true,
        },
        {
            type: 'list',
            name: 'language',
            message: 'Primary programming language:',
            choices: [
                { name: 'TypeScript', value: 'typescript' },
                { name: 'JavaScript', value: 'javascript' },
                { name: 'Python', value: 'python' },
                { name: 'Java', value: 'java' },
                { name: 'Go', value: 'go' },
                { name: 'Rust', value: 'rust' },
                { name: 'C#', value: 'csharp' },
                { name: 'Ruby', value: 'ruby' },
                { name: 'PHP', value: 'php' },
                { name: 'Other', value: 'other' },
            ],
            default: 'typescript',
        },
        {
            type: 'input',
            name: 'framework',
            message: 'Framework (if any, e.g., React, Next.js, Django, Express):',
            default: '',
        },
        {
            type: 'confirm',
            name: 'enableStaticAnalysis',
            message: 'Enable Semgrep static analysis for security and code quality?',
            default: true,
        },
    ]);
    // Start with default config or existing config
    const config = existingConfig
        ? JSON.parse(JSON.stringify(existingConfig))
        : JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    // Apply answers
    config.ai.provider = provider;
    config.ai.model = model;
    if (saveApiKey && apiKey) {
        config.apiKeys[provider] = apiKey;
    }
    config.analysis.defaultMode = defaultMode;
    config.analysis.autoDetectAgent = autoDetectAgent;
    config.analysis.language = language;
    config.analysis.framework = framework;
    config.analysis.enableStaticAnalysis = enableStaticAnalysis;
    // Save configuration
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    const isUpdate = !!existingConfig;
    console.log(chalk.green(`\n✅ ${isUpdate ? 'Updated' : 'Created'} ${path.relative(process.cwd(), configPath)}`));
    // Suggest adding config file to .gitignore
    if (saveApiKey && apiKey) {
        const gitignorePath = path.join(process.cwd(), '.gitignore');
        let shouldAddGitignore = false;
        if (fs.existsSync(gitignorePath)) {
            const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
            if (!gitignoreContent.includes('.pragent.config.json')) {
                const { addToGitignore } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'addToGitignore',
                        message: 'Add .pragent.config.json to .gitignore? (recommended - contains API keys)',
                        default: true,
                    },
                ]);
                shouldAddGitignore = addToGitignore;
            }
        }
        if (shouldAddGitignore) {
            fs.appendFileSync(gitignorePath, '\n# PR Agent configuration (contains API keys)\n.pragent.config.json\n');
            console.log(chalk.green('✅ Added .pragent.config.json to .gitignore'));
        }
    }
    console.log(chalk.green('\n🎉 Setup complete!'));
    console.log(chalk.cyan('\n📝 Configuration Summary:'));
    console.log(`  • Config file: ${path.relative(process.cwd(), configPath)}`);
    console.log(`  • AI Provider: ${config.ai.provider} (${config.ai.model})`);
    console.log(`  • Default Mode: ${config.analysis.defaultMode}`);
    console.log(`  • Auto Agent: ${config.analysis.autoDetectAgent ? 'Enabled' : 'Disabled'}`);
    console.log(`  • Language: ${config.analysis.language || 'Not set'}${config.analysis.framework ? ` (${config.analysis.framework})` : ''}`);
    console.log(`  • Static Analysis: ${config.analysis.enableStaticAnalysis ? 'Enabled' : 'Disabled'}`);
    console.log(chalk.cyan('\n💡 Tips:'));
    console.log('  • Change provider: pr-agent config --set ai.provider=openai');
    console.log('  • Change model: pr-agent config --set ai.model=gpt-4-turbo-preview');
    console.log('  • View settings: pr-agent config --list');
    console.log(chalk.cyan('\nNext steps:'));
    console.log('  1. Run: pr-agent analyze');
    console.log('  2. Or: pr-agent analyze --staged');
    console.log('  3. Or: pr-agent analyze --branch develop');
}
/**
 * List all configuration values
 */
function listConfig() {
    const configPath = findConfigPath();
    if (!configPath) {
        console.error(chalk.red(`❌ ${CONFIG_FILE} not found. Run: pr-agent config --init`));
        process.exit(1);
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    // Mask API keys for security
    const maskedConfig = JSON.parse(JSON.stringify(config));
    if (maskedConfig.apiKeys) {
        Object.keys(maskedConfig.apiKeys).forEach((key) => {
            if (maskedConfig.apiKeys[key]) {
                maskedConfig.apiKeys[key] = '***' + maskedConfig.apiKeys[key].slice(-4);
            }
        });
    }
    console.log(chalk.cyan(`📋 Configuration (${path.relative(process.cwd(), configPath)}):\n`));
    console.log(JSON.stringify(maskedConfig, null, 2));
}
/**
 * Get specific configuration value
 */
function getConfigValue(key) {
    const configPath = findConfigPath();
    if (!configPath) {
        console.error(chalk.red(`❌ ${CONFIG_FILE} not found. Run: pr-agent config --init`));
        process.exit(1);
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        }
        else {
            console.error(chalk.red(`❌ Key not found: ${key}`));
            process.exit(1);
        }
    }
    console.log(JSON.stringify(value, null, 2));
}
/**
 * Set configuration value
 */
function setConfigValue(keyValue) {
    const configPath = findConfigPath();
    if (!configPath) {
        console.error(chalk.red(`❌ ${CONFIG_FILE} not found. Run: pr-agent config --init`));
        process.exit(1);
    }
    const [key, ...valueParts] = keyValue.split('=');
    const valueStr = valueParts.join('=');
    if (!key || !valueStr) {
        console.error(chalk.red('❌ Invalid format. Use: key=value (e.g., ai.temperature=0.5)'));
        process.exit(1);
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const keys = key.split('.');
    let current = config;
    // Navigate to parent object
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k] || typeof current[k] !== 'object') {
            current[k] = {};
        }
        current = current[k];
    }
    // Parse value
    let value;
    try {
        value = JSON.parse(valueStr);
    }
    catch {
        value = valueStr;
    }
    // Set value
    current[keys[keys.length - 1]] = value;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green(`✅ Set ${key} = ${JSON.stringify(value)}`));
    console.log(chalk.gray(`   in ${path.relative(process.cwd(), configPath)}`));
}
/**
 * Reset configuration to defaults
 */
function resetConfig() {
    const configPath = findConfigPath();
    if (!configPath) {
        console.error(chalk.red(`❌ ${CONFIG_FILE} not found. Run: pr-agent config --init`));
        process.exit(1);
    }
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log(chalk.green(`✅ Reset ${path.relative(process.cwd(), configPath)} to defaults`));
}
/**
 * Validate configuration
 */
function validateConfig() {
    const configPath = findConfigPath();
    if (!configPath) {
        console.error(chalk.red(`❌ ${CONFIG_FILE} not found. Run: pr-agent config --init`));
        process.exit(1);
    }
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        // Validate structure
        const errors = [];
        if (!config.ai || !config.ai.provider) {
            errors.push('Missing ai.provider');
        }
        if (!config.ai || !config.ai.model) {
            errors.push('Missing ai.model');
        }
        if (!config.apiKeys) {
            errors.push('Missing apiKeys section');
        }
        if (errors.length > 0) {
            console.log(chalk.red('❌ Configuration validation failed:\n'));
            errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
            process.exit(1);
        }
        console.log(chalk.green('✅ Configuration is valid!'));
        console.log(chalk.cyan('\n📋 Configuration Summary:'));
        console.log(`  • Provider: ${config.ai.provider}`);
        console.log(`  • Model: ${config.ai.model}`);
        console.log(`  • Default Mode: ${config.analysis?.defaultMode || 'full'}`);
        console.log(`  • API Key Set: ${config.apiKeys[config.ai.provider] ? 'Yes' : 'No (using env var)'}`);
    }
    catch (error) {
        console.error(chalk.red('❌ Invalid JSON in configuration file'));
        process.exit(1);
    }
}
/**
 * Register config command with Commander
 */
export function registerConfigCommand(program) {
    program
        .command('config')
        .description('Manage PR Agent configuration')
        .option('--init', 'Initialize configuration with interactive setup')
        .option('--list', 'List all configuration values (API keys masked)')
        .option('--get <key>', 'Get specific configuration value (e.g., ai.temperature)')
        .option('--set <key=value>', 'Set configuration value (e.g., ai.temperature=0.5)')
        .option('--reset', 'Reset configuration to defaults')
        .option('--validate', 'Validate configuration file')
        .action(async (options) => {
        try {
            if (options.init) {
                await initializeConfig();
            }
            else if (options.list) {
                listConfig();
            }
            else if (options.get) {
                getConfigValue(options.get);
            }
            else if (options.set) {
                setConfigValue(options.set);
            }
            else if (options.reset) {
                resetConfig();
            }
            else if (options.validate) {
                validateConfig();
            }
            else {
                console.log(chalk.cyan('Usage:'));
                console.log('  pr-agent config --init                    # Interactive setup');
                console.log('  pr-agent config --list                    # Show all settings');
                console.log('  pr-agent config --get ai.model            # Get specific value');
                console.log('  pr-agent config --set ai.temperature=0.5  # Set value');
                console.log('  pr-agent config --validate                # Validate config');
                console.log('  pr-agent config --reset                   # Reset to defaults');
            }
        }
        catch (error) {
            console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=config.command.js.map