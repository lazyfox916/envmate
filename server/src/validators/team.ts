import { z } from 'zod';

/**
 * Create team schema
 */
export const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, 'Team name must be at least 2 characters')
    .max(100, 'Team name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Team name can only contain letters, numbers, spaces, hyphens, and underscores'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
});

/**
 * Update team schema
 */
export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(2, 'Team name must be at least 2 characters')
    .max(100, 'Team name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Team name can only contain letters, numbers, spaces, hyphens, and underscores')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Update member role schema
 */
export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']),
});

/**
 * Team ID parameter schema
 */
export const teamIdParamSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
});

/**
 * Team member params schema
 */
export const teamMemberParamsSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  userId: z.string().uuid('Invalid user ID'),
});

// Type exports
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
