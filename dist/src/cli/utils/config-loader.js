import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
const CONFIG_FILE = '.pragent.config.json';
export function findConfigFile() {
    let currentDir = process.cwd();
    const root = path.parse(currentDir).root;
    while (currentDir !== root) {
        const configPath = path.join(currentDir, CONFIG_FILE);
        if (fs.existsSync(configPath)) {
            return configPath;
        }
        currentDir = path.dirname(currentDir);
    }
    const rootConfigPath = path.join(root, CONFIG_FILE);
    if (fs.existsSync(rootConfigPath)) {
        return rootConfigPath;
    }
    return null;
}
export async function loadUserConfig(verbose = false) {
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
    }
    catch (error) {
        if (verbose) {
            console.error(chalk.red(`❌ Error loading configuration: ${error}`));
        }
        return {};
    }
}
export async function checkConfiguration() {
    const configPath = findConfigFile();
    if (!configPath) {
        console.log(chalk.yellow('\n⚠️  No configuration found'));
        console.log(chalk.gray('   Run: pr-agent config --init'));
        console.log(chalk.gray('   Or set ANTHROPIC_API_KEY environment variable\n'));
        return true;
    }
    try {
        const config = await loadUserConfig(false);
        if (!config.ai?.provider && !process.env.ANTHROPIC_API_KEY) {
            console.log(chalk.yellow('\n⚠️  No AI provider configured'));
            console.log(chalk.gray('   Run: pr-agent config --init\n'));
            return true;
        }
        return true;
    }
    catch (error) {
        console.error(chalk.red(`❌ Invalid configuration: ${error}`));
        return false;
    }
}
export function getApiKey(provider, config) {
    if (config?.apiKeys && config.apiKeys[provider]) {
        return config.apiKeys[provider];
    }
    const envVarMap = {
        claude: 'ANTHROPIC_API_KEY',
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
export function saveConfig(config, configPath) {
    const targetPath = configPath || path.join(process.cwd(), CONFIG_FILE);
    fs.writeFileSync(targetPath, JSON.stringify(config, null, 2), 'utf-8');
}
//# sourceMappingURL=config-loader.js.map