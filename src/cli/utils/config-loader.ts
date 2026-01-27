import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { validateConfigOrThrow, validateConfig } from '../../utils/config-validator.js';
import { ConfigurationError } from '../../utils/errors.js';

const CONFIG_FILE = '.pragent.config.json';

export interface UserConfig {
  apiKeys?: {
    anthropic?: string;
    openai?: string;
    google?: string;
    zhipu?: string;
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
    language?: string;
    framework?: string;
    enableStaticAnalysis?: boolean;
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
  /**
   * Peer Review configuration - integrates with issue trackers (Jira, etc.)
   * to validate PRs against tickets and acceptance criteria
   */
  peerReview?: {
    // Enable/disable peer review feature
    enabled?: boolean;
    // Issue tracker provider: 'jira' | 'linear' | 'azure-devops' | 'github-issues'
    provider?: string;
    // Use MCP server for Jira access (recommended)
    useMcp?: boolean;
    // Direct API access settings (fallback if MCP not available)
    instanceUrl?: string;
    email?: string;
    apiToken?: string;
    // Default project key
    defaultProject?: string;
    // Custom field IDs (Jira-specific)
    acceptanceCriteriaField?: string;
    storyPointsField?: string;
    // Custom ticket patterns (regex) - defaults to PROJ-123 format
    ticketPatterns?: string[];
    // Analysis options
    analyzeAcceptanceCriteria?: boolean;
    rateTicketQuality?: boolean;
    generateTestSuggestions?: boolean;
    checkScopeCreep?: boolean;
    // Output options
    includeTicketDetails?: boolean;
    verbose?: boolean;
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
export async function loadUserConfig(
  verbose: boolean = false,
  validate: boolean = true,
): Promise<UserConfig> {
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

    // Validate configuration if requested
    if (validate) {
      try {
        return validateConfigOrThrow(config, configPath);
      } catch (error) {
        if (error instanceof ConfigurationError) {
          if (verbose) {
            console.error(chalk.red(`\n❌ ${error.message}`));
          }
          throw error;
        }
        throw error;
      }
    }

    return config;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    
    if (error instanceof SyntaxError) {
      throw new ConfigurationError(
        `Invalid JSON in configuration file: ${error.message}\n\nRun: pr-agent config --init to recreate configuration.`,
        'config',
      );
    }
    
    if (verbose) {
      console.error(chalk.red(`❌ Error loading configuration: ${error instanceof Error ? error.message : String(error)}`));
    }
    throw new ConfigurationError(
      `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}\n\nRun: pr-agent config --init to fix configuration.`,
      'config',
    );
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
    const config = await loadUserConfig(false, true); // Validate config
    
    // Basic validation
    if (!config.ai?.provider && !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GOOGLE_API_KEY) {
      console.log(chalk.yellow('\n⚠️  No AI provider configured'));
      console.log(chalk.gray('   Run: pr-agent config --init\n'));
      return true; // Don't block execution
    }

    // Validate branch configuration if present
    if (config.git?.defaultBranch) {
      const validation = validateConfig(config);
      if (!validation.success) {
        const branchErrors = validation.errors.filter((e) => e.includes('defaultBranch'));
        if (branchErrors.length > 0) {
          console.log(chalk.yellow('\n⚠️  Invalid branch configuration:'));
          branchErrors.forEach((err) => console.log(chalk.gray(`   • ${err}`)));
          console.log(chalk.gray('   Run: pr-agent config --set git.defaultBranch=<branch-name>\n'));
        }
      }
    }

    return true;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(chalk.red(`\n❌ ${error.message}`));
      return false;
    }
    console.error(chalk.red(`❌ Invalid configuration: ${error instanceof Error ? error.message : String(error)}`));
    return false;
  }
}

/**
 * Get API key from config or environment
 */
export function getApiKey(provider: string, config?: UserConfig): string | undefined {
  // Check config first
  if (config?.apiKeys) {
    const key = config.apiKeys[provider as keyof typeof config.apiKeys];
    if (key && key.trim().length > 0) {
      return key;
    }
  }

  // Fall back to environment variables
  const envVarMap: Record<string, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY',
    zhipu: 'ZHIPU_API_KEY',
  };

  const envVar = envVarMap[provider.toLowerCase()];
  if (envVar) {
    const envKey = process.env[envVar];
    if (envKey && envKey.trim().length > 0) {
      return envKey;
    }
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

