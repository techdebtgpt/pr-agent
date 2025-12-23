import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs';
import { UserConfig } from './config-loader.js';

export interface PromptOptions {
  includeApiKey?: boolean;
  includeAnalysisPreferences?: boolean;
  verbose?: boolean;
}

export interface PromptAnswers {
  provider: string;
  selectedModel: string;
  apiKey?: string;
  saveApiKey?: boolean;
  defaultMode?: string;
  autoDetectAgent?: boolean;
  language?: string;
  framework?: string;
  enableStaticAnalysis?: boolean;
}

/**
 * Get existing configuration if available
 */
export function getExistingConfig(projectPath: string): UserConfig | null {
  const configPath = `${projectPath}/.pragent.config.json`;
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Prompt for full configuration
 */
export async function promptFullConfig(
  projectPath: string,
  options: PromptOptions = {},
): Promise<{ answers: PromptAnswers; existingConfig: UserConfig | null }> {
  const existingConfig = getExistingConfig(projectPath);

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
      default: existingConfig?.ai?.provider || 'anthropic',
    },
  ]);

  // Model selection based on provider
  let modelChoices: { name: string; value: string }[] = [];
  let defaultModel = '';

  if (provider === 'anthropic') {
    modelChoices = [
      { name: 'Claude Sonnet 4.5 (Recommended)', value: 'claude-sonnet-4-5-20250929' },
      { name: 'Claude Sonnet 3.5', value: 'claude-3-5-sonnet-20241022' },
      { name: 'Claude Opus', value: 'claude-3-opus-20240229' },
    ];
    defaultModel = 'claude-sonnet-4-5-20250929';
  } else if (provider === 'openai') {
    modelChoices = [
      { name: 'GPT-5.1 (Latest)', value: 'gpt-5.1' },
      { name: 'GPT-4 Turbo (Recommended)', value: 'gpt-4-turbo-preview' },
      { name: 'GPT-4', value: 'gpt-4' },
      { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
    ];
    defaultModel = 'gpt-4-turbo-preview';
  } else if (provider === 'google') {
    modelChoices = [
      { name: 'Gemini Pro (Recommended)', value: 'gemini-pro' },
      { name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
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

  const answers: PromptAnswers = {
    provider,
    selectedModel,
  };

  // API key prompt (optional)
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

  // Analysis preferences (optional)
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
        default: existingConfig?.analysis?.language || 'typescript',
      },
      {
        type: 'input',
        name: 'framework',
        message: 'Framework (if any, e.g., React, Next.js, Django, Express):',
        default: existingConfig?.analysis?.framework || '',
      },
      {
        type: 'confirm',
        name: 'enableStaticAnalysis',
        message: 'Enable Semgrep static analysis for security and code quality?',
        default: existingConfig?.analysis?.enableStaticAnalysis !== false,
      },
    ]);

    answers.defaultMode = analysisPrompts.defaultMode;
    answers.autoDetectAgent = analysisPrompts.autoDetectAgent;
    answers.language = analysisPrompts.language;
    answers.framework = analysisPrompts.framework;
    answers.enableStaticAnalysis = analysisPrompts.enableStaticAnalysis;
  }

  return { answers, existingConfig };
}

/**
 * Prompt for provider selection only
 */
export async function promptProvider(defaultProvider?: string): Promise<string> {
  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select AI provider:',
      choices: [
        { name: 'Anthropic Claude', value: 'anthropic' },
        { name: 'OpenAI GPT', value: 'openai' },
        { name: 'Google Gemini', value: 'google' },
      ],
      default: defaultProvider || 'anthropic',
    },
  ]);

  return provider;
}

/**
 * Prompt for API key
 */
export async function promptApiKey(provider: string): Promise<string> {
  const { apiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: `Enter ${provider.toUpperCase()} API key:`,
      mask: '*',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'API key is required';
        }
        return true;
      },
    },
  ]);

  return apiKey;
}

/**
 * Prompt for confirmation
 */
export async function promptConfirm(message: string, defaultValue: boolean = true): Promise<boolean> {
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

/**
 * Display success message with configuration summary
 */
export function displayConfigSummary(config: UserConfig, configPath: string): void {
  console.log(chalk.green('\n✅ Configuration saved successfully!'));
  console.log(chalk.cyan('\n📝 Configuration Summary:'));
  console.log(`  • Config file: ${configPath}`);
  console.log(`  • AI Provider: ${config.ai?.provider}`);
  console.log(`  • Model: ${config.ai?.model}`);
  console.log(`  • Default Mode: ${config.analysis?.defaultMode || 'full'}`);
  console.log(`  • Auto Agent: ${config.analysis?.autoDetectAgent ? 'Enabled' : 'Disabled'}`);
  console.log(`  • Language: ${config.analysis?.language || 'Not set'}${config.analysis?.framework ? ` (${config.analysis.framework})` : ''}`);
  console.log(`  • Static Analysis: ${config.analysis?.enableStaticAnalysis ? 'Enabled' : 'Disabled'}`);

  console.log(chalk.cyan('\n💡 Next Steps:'));
  console.log('  1. Run: pr-agent analyze');
  console.log('  2. Or: pr-agent analyze --staged');
  console.log('  3. Or: pr-agent help');
}

