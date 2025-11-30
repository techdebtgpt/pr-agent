/**
 * Tests for config-loader.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  findConfigFile,
  loadUserConfig,
  getApiKey,
} from '../src/cli/utils/config-loader.js';
import { ConfigurationError } from '../src/utils/errors.js';

describe('config-loader', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-agent-test-'));
    process.chdir(tempDir);
    jest.clearAllMocks();
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        // Change back to original directory before cleanup
        process.chdir(require('os').homedir());
        // Use setTimeout to allow file handles to close on Windows
        setTimeout(() => {
          try {
            fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
          } catch {
            // Ignore cleanup errors on Windows
          }
        }, 100);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('findConfigFile', () => {
    it('should find config file in current directory', () => {
      const configPath = path.join(tempDir, '.pragent.config.json');
      fs.writeFileSync(configPath, '{}');

      const result = findConfigFile();
      expect(result).toBe(configPath);
    });

    it('should return null if no config file exists', () => {
      const result = findConfigFile();
      expect(result).toBeNull();
    });
  });

  describe('loadUserConfig', () => {
    it('should load valid config file', async () => {
      const configPath = path.join(tempDir, '.pragent.config.json');
      const config = {
        ai: { provider: 'openai' as const, model: 'gpt-4' },
        git: { defaultBranch: 'origin/main' },
      };

      fs.writeFileSync(configPath, JSON.stringify(config));

      const result = await loadUserConfig(false, true);
      expect(result.ai?.provider).toBe('openai');
      expect(result.git?.defaultBranch).toBe('origin/main');
    });

    it('should throw ConfigurationError for invalid JSON', async () => {
      const configPath = path.join(tempDir, '.pragent.config.json');
      fs.writeFileSync(configPath, 'invalid json{');

      await expect(loadUserConfig(false, true)).rejects.toThrow(ConfigurationError);
    });

    it('should return empty object if no config file', async () => {
      const result = await loadUserConfig(false, false);
      expect(result).toEqual({});
    });
  });

  describe('getApiKey', () => {
    it('should get API key from config', () => {
      const config = {
        apiKeys: {
          openai: 'sk-test-key-123',
        },
      };

      const result = getApiKey('openai', config);
      expect(result).toBe('sk-test-key-123');
    });

    it('should get API key from environment variable', () => {
      process.env.OPENAI_API_KEY = 'sk-env-key-456';
      const result = getApiKey('openai', {});
      expect(result).toBe('sk-env-key-456');
      delete process.env.OPENAI_API_KEY;
    });

    it('should prefer config over environment', () => {
      process.env.OPENAI_API_KEY = 'sk-env-key';
      const config = {
        apiKeys: {
          openai: 'sk-config-key',
        },
      };

      const result = getApiKey('openai', config);
      expect(result).toBe('sk-config-key');
      delete process.env.OPENAI_API_KEY;
    });

    it('should return undefined if no key found', () => {
      const result = getApiKey('openai', {});
      expect(result).toBeUndefined();
    });

    it('should handle empty string keys', () => {
      const config = {
        apiKeys: {
          openai: '',
        },
      };

      const result = getApiKey('openai', config);
      expect(result).toBeUndefined();
    });
  });
});

