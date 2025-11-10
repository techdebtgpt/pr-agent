import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

const CONFIG_FILE = '.pragent.config.json';

export interface UserConfig {
  apiKeys?: {
    anthropic?: string;
    openai?: string;
    google?: string;
  };
  ai?: {
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  analysis?: {
    defaultMode?: string;
    maxCost?: number;
    autoDetectAgent?: boolean;
    agentThreshold?: number;
  };
  git?: {
    defaultBranch?: string;
    includeUntracked?: boolean;
    excludePatterns?: string[];
  };
  output?: {
    verbose?: boolean;
    showStrategy?: boolean;
    showRecommendations?: boolean;
  };
}

/**
 * Find config file in current directory or parent directories
 */
export function findConfigFile(): string | null {
  let currentDir = process.cwd();
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const configPath = path.join(currentDir, CONFIG_FILE);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
    currentDir = path.dirname(currentDir);
  }

  // Check root directory as well
  const rootConfigPath = path.join(root, CONFIG_FILE);
  if (fs.existsSync(rootConfigPath)) {
    return rootConfigPath;
  }

  return null;
}

/**
 * Load user configuration from file
 */
export async function loadUserConfig(verbose: boolean = false): Promise<UserConfig> {
  const configPath = findConfigFile();

  if (!configPath) {
    if (verbose) {
      console.log(chalk.yellow('⚠️  No configuration file found'));
      console.log(chalk.gray('   Run: pr-agent config --init'));
    }
    return {};
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    if (verbose) {
      console.log(chalk.green(`✅ Loaded configuration from: ${path.relative(process.cwd(), configPath)}`));
    }

    return config;
  } catch (error) {
    if (verbose) {
      console.error(chalk.red(`❌ Error loading configuration: ${error}`));
    }
    return {};
  }
}

/**
 * Check if configuration exists and is valid
 */
export async function checkConfiguration(): Promise<boolean> {
  const configPath = findConfigFile();

  if (!configPath) {
    console.log(chalk.yellow('\n⚠️  No configuration found'));
    console.log(chalk.gray('   Run: pr-agent config --init'));
    console.log(chalk.gray('   Or set ANTHROPIC_API_KEY environment variable\n'));
    return true; // Don't block execution, just warn
  }

  try {
    const config = await loadUserConfig(false);
    
    // Basic validation
    if (!config.ai?.provider && !process.env.ANTHROPIC_API_KEY) {
      console.log(chalk.yellow('\n⚠️  No AI provider configured'));
      console.log(chalk.gray('   Run: pr-agent config --init\n'));
      return true; // Don't block execution
    }

    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Invalid configuration: ${error}`));
    return false;
  }
}

/**
 * Get API key from config or environment
 */
export function getApiKey(provider: string, config?: UserConfig): string | undefined {
  // Check config first
  if (config?.apiKeys && config.apiKeys[provider as keyof typeof config.apiKeys]) {
    return config.apiKeys[provider as keyof typeof config.apiKeys];
  }

  // Fall back to environment variables
  const envVarMap: Record<string, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY',
  };

  const envVar = envVarMap[provider.toLowerCase()];
  if (envVar) {
    return process.env[envVar];
  }

  return undefined;
}

/**
 * Save configuration to file
 */
export function saveConfig(config: UserConfig, configPath?: string): void {
  const targetPath = configPath || path.join(process.cwd(), CONFIG_FILE);
  fs.writeFileSync(targetPath, JSON.stringify(config, null, 2), 'utf-8');
}

