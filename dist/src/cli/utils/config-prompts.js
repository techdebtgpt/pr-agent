import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs';
export function getExistingConfig(projectPath) {
    const configPath = `${projectPath}/.pragent.config.json`;
    if (fs.existsSync(configPath)) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
        catch {
            return null;
        }
    }
    return null;
}
export async function promptFullConfig(projectPath, options = {}) {
    const existingConfig = getExistingConfig(projectPath);
    const { provider } = await inquirer.prompt([
        {
            type: 'list',
            name: 'provider',
            message: 'Select AI provider:',
            choices: [
                { name: 'Anthropic Claude (Recommended)', value: 'claude' },
                { name: 'OpenAI GPT', value: 'openai' },
                { name: 'Google Gemini', value: 'google' },
            ],
            default: existingConfig?.ai?.provider || 'claude',
        },
    ]);
    let modelChoices = [];
    let defaultModel = '';
    if (provider === 'claude') {
        modelChoices = [
            { name: 'Claude Sonnet 4.5 (Recommended)', value: 'claude-sonnet-4-5-20250929' },
            { name: 'Claude Sonnet 3.5', value: 'claude-3-5-sonnet-20241022' },
            { name: 'Claude Opus', value: 'claude-3-opus-20240229' },
        ];
        defaultModel = 'claude-sonnet-4-5-20250929';
    }
    else if (provider === 'openai') {
        modelChoices = [
            { name: 'GPT-4 Turbo', value: 'gpt-4-turbo-preview' },
            { name: 'GPT-4', value: 'gpt-4' },
            { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
        ];
        defaultModel = 'gpt-4-turbo-preview';
    }
    else if (provider === 'google') {
        modelChoices = [
            { name: 'Gemini Pro', value: 'gemini-pro' },
            { name: 'Gemini Ultra', value: 'gemini-ultra' },
        ];
        defaultModel = 'gemini-pro';
    }
    const { selectedModel } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedModel',
            message: 'Select model:',
            choices: modelChoices,
            default: existingConfig?.ai?.model || defaultModel,
        },
    ]);
    const answers = {
        provider,
        selectedModel,
    };
    if (options.includeApiKey !== false) {
        const apiKeyPrompts = await inquirer.prompt([
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
                when: (promptAnswers) => !!promptAnswers.apiKey,
            },
        ]);
        answers.apiKey = apiKeyPrompts.apiKey;
        answers.saveApiKey = apiKeyPrompts.saveApiKey;
    }
    if (options.includeAnalysisPreferences !== false) {
        const analysisPrompts = await inquirer.prompt([
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
                default: existingConfig?.analysis?.defaultMode || 'full',
            },
            {
                type: 'confirm',
                name: 'autoDetectAgent',
                message: 'Auto-detect when to use intelligent agent for large diffs?',
                default: existingConfig?.analysis?.autoDetectAgent !== false,
            },
        ]);
        answers.defaultMode = analysisPrompts.defaultMode;
        answers.autoDetectAgent = analysisPrompts.autoDetectAgent;
    }
    return { answers, existingConfig };
}
export async function promptProvider(defaultProvider) {
    const { provider } = await inquirer.prompt([
        {
            type: 'list',
            name: 'provider',
            message: 'Select AI provider:',
            choices: [
                { name: 'Anthropic Claude', value: 'claude' },
                { name: 'OpenAI GPT', value: 'openai' },
                { name: 'Google Gemini', value: 'google' },
            ],
            default: defaultProvider || 'claude',
        },
    ]);
    return provider;
}
export async function promptApiKey(provider) {
    const { apiKey } = await inquirer.prompt([
        {
            type: 'password',
            name: 'apiKey',
            message: `Enter ${provider.toUpperCase()} API key:`,
            mask: '*',
            validate: (input) => {
                if (!input || input.trim().length === 0) {
                    return 'API key is required';
                }
                return true;
            },
        },
    ]);
    return apiKey;
}
export async function promptConfirm(message, defaultValue = true) {
    const { confirmed } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirmed',
            message,
            default: defaultValue,
        },
    ]);
    return confirmed;
}
export function displayConfigSummary(config, configPath) {
    console.log(chalk.green('\n✅ Configuration saved successfully!'));
    console.log(chalk.cyan('\n📝 Configuration Summary:'));
    console.log(`  • Config file: ${configPath}`);
    console.log(`  • AI Provider: ${config.ai?.provider}`);
    console.log(`  • Model: ${config.ai?.model}`);
    console.log(`  • Default Mode: ${config.analysis?.defaultMode || 'full'}`);
    console.log(`  • Auto Agent: ${config.analysis?.autoDetectAgent ? 'Enabled' : 'Disabled'}`);
    console.log(chalk.cyan('\n💡 Next Steps:'));
    console.log('  1. Run: pr-agent analyze');
    console.log('  2. Or: pr-agent analyze --staged');
    console.log('  3. Or: pr-agent help');
}
//# sourceMappingURL=config-prompts.js.map