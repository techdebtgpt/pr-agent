/**
 * Configuration validation using Zod
 */

import { z } from 'zod';
import { ConfigurationError } from './errors.js';
import { UserConfig } from '../cli/utils/config-loader.js';

/**
 * Zod schema for validating UserConfig
 */
export const UserConfigSchema = z.object({
  apiKeys: z
    .object({
      anthropic: z.string().optional(),
      openai: z.string().optional(),
      google: z.string().optional(),
      zhipu: z.string().optional(),
    })
    .optional(),
  ai: z
    .object({
      provider: z.enum(['anthropic', 'openai', 'google', 'zhipu']).optional(),
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().positive().int().optional(),
    })
    .optional(),
  analysis: z
    .object({
      defaultMode: z.enum(['full', 'summary', 'risks', 'complexity']).optional(),
      maxCost: z.number().nonnegative().optional(),
      autoDetectAgent: z.boolean().optional(),
      agentThreshold: z.number().nonnegative().int().optional(),
      language: z.string().optional(),
      framework: z.string().optional(),
      enableStaticAnalysis: z.boolean().optional(),
    })
    .optional(),
  git: z
    .object({
      defaultBranch: z
        .string()
        .min(1)
        .refine(
          (val) => {
            // Allow origin/branch, branch, or just branch name
            // Reject empty strings and invalid patterns
            if (!val || val.trim().length === 0) return false;
            // Basic validation: should not contain dangerous characters
            if (/[<>"|\\\x00-\x1f]/.test(val)) return false;
            return true;
          },
          {
            message: 'defaultBranch must be a valid branch name (e.g., "origin/main", "main", "master")',
          },
        )
        .optional(),
      includeUntracked: z.boolean().optional(),
      excludePatterns: z.array(z.string()).optional(),
    })
    .optional(),
  output: z
    .object({
      verbose: z.boolean().optional(),
      showStrategy: z.boolean().optional(),
      showRecommendations: z.boolean().optional(),
    })
    .optional(),
  peerReview: z
    .object({
      enabled: z.boolean().optional(),
      provider: z.string().optional(),
      useMcp: z.boolean().optional(),
      instanceUrl: z.string().url().optional(),
      email: z.string().email().optional(),
      apiToken: z.string().optional(),
      defaultProject: z.string().optional(),
      acceptanceCriteriaField: z.string().optional(),
      storyPointsField: z.string().optional(),
      ticketPatterns: z.array(z.string()).optional(),
      analyzeAcceptanceCriteria: z.boolean().optional(),
      rateTicketQuality: z.boolean().optional(),
      generateTestSuggestions: z.boolean().optional(),
      checkScopeCreep: z.boolean().optional(),
      includeTicketDetails: z.boolean().optional(),
      verbose: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Validate configuration object
 */
export function validateConfig(config: UserConfig): {
  success: boolean;
  errors: string[];
  sanitizedConfig?: UserConfig;
} {
  try {
    const result = UserConfigSchema.safeParse(config);
    
    if (result.success) {
      return {
        success: true,
        errors: [],
        sanitizedConfig: result.data as UserConfig,
      };
    } else {
      const errors = result.error.issues.map((err: any) => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });
      
      return {
        success: false,
        errors,
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Validate and throw if invalid
 */
export function validateConfigOrThrow(config: UserConfig, configPath?: string): UserConfig {
  const validation = validateConfig(config);
  
  if (!validation.success) {
    const errorMessage = `Invalid configuration${configPath ? ` in ${configPath}` : ''}:\n${validation.errors.map((e) => `  • ${e}`).join('\n')}\n\nRun: pr-agent config --init to fix configuration.`;
    throw new ConfigurationError(errorMessage, 'config');
  }
  
  return validation.sanitizedConfig!;
}

