#!/usr/bin/env node

/**
 * Setup script for local MCP server development
 *
 * This script helps configure the PR Agent MCP server for local development
 * by generating a properly configured MCP settings snippet.
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as fs from 'fs';
import * as os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const repoRoot = resolve(__dirname, '..');
const distPath = resolve(repoRoot, 'dist', 'mcp', 'server.js');

console.log('\n🚀 PR Agent MCP Server - Local Development Setup\n');
console.log('═══════════════════════════════════════════════════\n');

// Check if build exists
if (!fs.existsSync(distPath)) {
  console.error('❌ Error: MCP server not built yet!\n');
  console.log('Please run the build first:');
  console.log('  npm run build\n');
  process.exit(1);
}

console.log('✅ MCP server build found\n');
console.log('📍 Repository path:', repoRoot);
console.log('📦 Server path:', distPath);
console.log('\n═══════════════════════════════════════════════════\n');

// Detect OS and provide instructions
const platform = os.platform();
let settingsPath;

if (platform === 'win32') {
  settingsPath = resolve(os.homedir(), '.claude', 'settings.json');
} else {
  settingsPath = resolve(os.homedir(), '.claude', 'settings.json');
}

console.log('📋 Configuration Instructions:\n');
console.log('1. Open your Claude Code settings file:');
console.log(`   ${settingsPath}\n`);
console.log('2. Add this MCP server configuration:\n');

// Generate configuration with proper path format
const serverPath = distPath.replace(/\\/g, '/');

const mcpConfig = {
  mcpServers: {
    "pr-agent": {
      command: "node",
      args: [serverPath],
      env: {
        NODE_ENV: "development"
      }
    }
  }
};

console.log(JSON.stringify(mcpConfig, null, 2));
console.log('\n3. Save the file and restart Claude Code\n');
console.log('═══════════════════════════════════════════════════\n');

// Check if settings file exists
if (fs.existsSync(settingsPath)) {
  console.log('📝 Claude Code settings file found!\n');

  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

    if (settings.mcpServers && settings.mcpServers['pr-agent']) {
      console.log('⚠️  Warning: PR Agent MCP server is already configured\n');
      console.log('Current configuration:');
      console.log(JSON.stringify(settings.mcpServers['pr-agent'], null, 2));
      console.log('\n');
    } else {
      console.log('ℹ️  PR Agent MCP server is not yet configured\n');
    }
  } catch (err) {
    console.log('⚠️  Could not parse settings file (might be empty or invalid JSON)\n');
  }
} else {
  console.log('ℹ️  Claude Code settings file not found\n');
  console.log('You may need to create it first at:');
  console.log(`   ${settingsPath}\n`);
}

console.log('✨ Setup complete! Follow the instructions above to configure.\n');
console.log('📚 For more details, see: MCP-LOCAL-SETUP.md\n');
