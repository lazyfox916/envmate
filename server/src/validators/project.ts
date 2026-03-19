import { z } from 'zod';

/**
 * Project Validation Schemas
 */

// Valid environment key pattern
const envKeyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be 100 characters or less')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .trim()
    .optional(),
  environment: z
    .enum(['development', 'staging', 'production', 'testing'])
    .optional()
    .default('development'),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be 100 characters or less')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .trim()
    .optional(),
  environment: z
    .enum(['development', 'staging', 'production', 'testing'])
    .optional(),
});

export const listProjectsSchema = z.object({
  environment: z
    .enum(['development', 'staging', 'production', 'testing'])
    .optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce.number().int().positive().max(100).catch(20),
});

/**
 * Environment Variable Schemas
 */

export const envVariableSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .max(256, 'Key must be 256 characters or less')
    .regex(envKeyPattern, 'Key must start with a letter or underscore and contain only alphanumeric characters and underscores'),
  value: z
    .string()
    .max(10000, 'Value must be 10000 characters or less'),
  comment: z
    .string()
    .max(500, 'Comment must be 500 characters or less')
    .optional(),
});

export const uploadEnvSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(100 * 1024, 'File content too large (max 100KB)'),
  overwrite: z.boolean().optional().default(false),
});

export const updateEnvVariablesSchema = z.object({
  variables: z
    .array(envVariableSchema)
    .min(1, 'At least one variable is required')
    .max(500, 'Maximum 500 variables allowed'),
});

export const updateSingleVariableSchema = z.object({
  value: z
    .string()
    .max(10000, 'Value must be 10000 characters or less'),
  comment: z
    .string()
    .max(500, 'Comment must be 500 characters or less')
    .optional(),
});

export const deleteVariableParamsSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  key: z
    .string()
    .min(1, 'Key is required')
    .regex(envKeyPattern, 'Invalid key format'),
});

export const projectIdParamsSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

export const teamProjectParamsSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
});

// Export types
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsInput = z.infer<typeof listProjectsSchema>;
export type EnvVariableInput = z.infer<typeof envVariableSchema>;
export type UploadEnvInput = z.infer<typeof uploadEnvSchema>;
export type UpdateEnvVariablesInput = z.infer<typeof updateEnvVariablesSchema>;
export type UpdateSingleVariableInput = z.infer<typeof updateSingleVariableSchema>;
