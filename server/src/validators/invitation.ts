import { z } from 'zod';
import { TeamRole } from '../models/TeamMember';

/**
 * Create invitation schema
 */
export const createInvitationSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .transform((val) => val.toLowerCase().trim()),
  role: z
    .nativeEnum(TeamRole)
    .optional()
    .default(TeamRole.VIEWER),
});

/**
 * Accept invitation schema
 */
export const acceptInvitationSchema = z.object({
  token: z
    .string()
    .min(32, 'Invalid invitation token')
    .max(128, 'Invalid invitation token'),
});

/**
 * Reject invitation schema
 */
export const rejectInvitationSchema = z.object({
  token: z
    .string()
    .min(32, 'Invalid invitation token')
    .max(128, 'Invalid invitation token'),
});

/**
 * Token parameter schema (for URL params)
 */
export const tokenParamSchema = z.object({
  token: z
    .string()
    .min(32, 'Invalid invitation token')
    .max(128, 'Invalid invitation token'),
});

/**
 * Invitation ID parameter schema
 */
export const invitationIdParamSchema = z.object({
  invitationId: z.string().uuid('Invalid invitation ID'),
});

/**
 * Combined team and invitation params
 */
export const teamInvitationParamsSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  invitationId: z.string().uuid('Invalid invitation ID'),
});

/**
 * Bulk invite schema (for inviting multiple users at once)
 */
export const bulkInviteSchema = z.object({
  invitations: z
    .array(
      z.object({
        email: z
          .string()
          .email('Invalid email address')
          .max(255, 'Email must be less than 255 characters')
          .transform((val) => val.toLowerCase().trim()),
        role: z
          .nativeEnum(TeamRole)
          .optional()
          .default(TeamRole.VIEWER),
      })
    )
    .min(1, 'At least one invitation is required')
    .max(10, 'Maximum 10 invitations at once'),
});

// Types
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type RejectInvitationInput = z.infer<typeof rejectInvitationSchema>;
export type BulkInviteInput = z.infer<typeof bulkInviteSchema>;
