/**
 * Invitation Routes
 * Handles team invitation endpoints with secure token handling
 */

import { Router, Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { authenticate, validate, optionalAuth, validateParams } from '../middleware/auth';
import { requireTeamMember, requireTeamAdmin } from '../middleware/team';
import { InvitationService } from '../services/InvitationService';
import {
  createInvitationSchema,
  acceptInvitationSchema,
  rejectInvitationSchema,
  tokenParamSchema,
} from '../validators/invitation';
import { authRateLimiter } from '../middleware/security';

const router = Router();

// ===========================================
// Public Routes (token-based, no auth required)
// ===========================================

/**
 * @route   GET /api/v1/invitations/validate/:token
 * @desc    Validate invitation token and get details (no auth required)
 * @access  Public
 */
router.get(
  '/validate/:token',
  authRateLimiter,
  validateParams(tokenParamSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await InvitationService.validateToken(req.params.token as string);

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      // Return safe invitation details (exclude sensitive data)
      const { invitation, team, inviter } = result.data!;
      res.json(
        successResponse({
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expires_at,
          team: {
            id: team.id,
            name: team.name,
            description: team.description,
          },
          inviter: {
            name: inviter.name,
          },
        })
      );
    } catch (error) {
      console.error('Validate token error:', error);
      res.status(500).json(errorResponse('Failed to validate invitation'));
    }
  }
);

/**
 * @route   POST /api/v1/invitations/accept
 * @desc    Accept an invitation (requires auth)
 * @access  Private
 */
router.post(
  '/accept',
  authenticate,
  authRateLimiter,
  validate(acceptInvitationSchema),
  async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      const result = await InvitationService.acceptInvitation(
        token,
        req.userId!,
        req
      );

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      res.json(
        successResponse({
          message: 'Invitation accepted successfully',
          team: {
            id: result.data!.team.id,
            name: result.data!.team.name,
          },
          membership: {
            role: result.data!.membership.role,
            joinedAt: result.data!.membership.joined_at,
          },
        })
      );
    } catch (error) {
      console.error('Accept invitation error:', error);
      res.status(500).json(errorResponse('Failed to accept invitation'));
    }
  }
);

/**
 * @route   POST /api/v1/invitations/reject
 * @desc    Reject an invitation (can be done without auth using token)
 * @access  Public
 */
router.post(
  '/reject',
  authRateLimiter,
  optionalAuth,
  validate(rejectInvitationSchema),
  async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      const result = await InvitationService.rejectInvitation(
        token,
        req.userId,
        req
      );

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      res.json(successResponse({ message: 'Invitation rejected' }));
    } catch (error) {
      console.error('Reject invitation error:', error);
      res.status(500).json(errorResponse('Failed to reject invitation'));
    }
  }
);

/**
 * @route   GET /api/v1/invitations/pending
 * @desc    Get pending invitations for current user
 * @access  Private
 */
router.get('/pending', authenticate, async (req: Request, res: Response) => {
  try {
    // Get user's email from the request
    const User = (await import('../models')).User;
    const user = await User.findByPk(req.userId!);
    
    if (!user) {
      res.status(404).json(errorResponse('User not found'));
      return;
    }

    const result = await InvitationService.getUserInvitations(user.email);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error!));
      return;
    }

    // Return safe invitation data
    const invitations = result.data!.map((inv) => ({
      id: inv.id,
      role: inv.role,
      expiresAt: inv.expires_at,
      createdAt: inv.created_at,
      team: inv.team ? {
        id: inv.team.id,
        name: inv.team.name,
        description: inv.team.description,
      } : null,
      inviter: inv.inviter ? {
        name: inv.inviter.name,
      } : null,
    }));

    res.json(successResponse(invitations));
  } catch (error) {
    console.error('Get pending invitations error:', error);
    res.status(500).json(errorResponse('Failed to get invitations'));
  }
});

// ===========================================
// Team-specific Routes (nested under teams)
// ===========================================

/**
 * Create a router for team invitation routes
 * These will be mounted at /api/v1/teams/:teamId/invitations
 */
export const teamInvitationRouter = Router({ mergeParams: true });

// All team invitation routes require authentication
teamInvitationRouter.use(authenticate);

/**
 * @route   POST /api/v1/teams/:teamId/invitations
 * @desc    Create and send a team invitation
 * @access  Private (team admins only)
 */
teamInvitationRouter.post(
  '/',
  requireTeamMember,
  requireTeamAdmin,
  validate(createInvitationSchema),
  async (req: Request, res: Response) => {
    try {
      const teamId = req.params.teamId as string;
      const { email, role } = req.body;

      const result = await InvitationService.createInvitation(
        {
          teamId,
          email,
          role,
          invitedBy: req.userId!,
        },
        req
      );

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      res.status(201).json(
        successResponse({
          id: result.data!.id,
          email: result.data!.email,
          role: result.data!.role,
          status: result.data!.status,
          expiresAt: result.data!.expires_at,
        })
      );
    } catch (error) {
      console.error('Create invitation error:', error);
      res.status(500).json(errorResponse('Failed to create invitation'));
    }
  }
);

/**
 * @route   GET /api/v1/teams/:teamId/invitations
 * @desc    Get pending invitations for a team
 * @access  Private (team admins only)
 */
teamInvitationRouter.get(
  '/',
  requireTeamMember,
  requireTeamAdmin,
  async (req: Request, res: Response) => {
    try {
      const teamId = req.params.teamId as string;

      const result = await InvitationService.getTeamInvitations(
        teamId,
        req.userId!
      );

      if (!result.success) {
        res.status(403).json(errorResponse(result.error!));
        return;
      }

      // Return safe invitation data
      const invitations = result.data!.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expires_at,
        createdAt: inv.created_at,
        inviter: inv.inviter ? {
          id: inv.inviter.id,
          name: inv.inviter.name,
          email: inv.inviter.email,
        } : null,
      }));

      res.json(successResponse(invitations));
    } catch (error) {
      console.error('Get team invitations error:', error);
      res.status(500).json(errorResponse('Failed to get invitations'));
    }
  }
);

/**
 * @route   DELETE /api/v1/teams/:teamId/invitations/:invitationId
 * @desc    Revoke a pending invitation
 * @access  Private (team admins only)
 */
teamInvitationRouter.delete(
  '/:invitationId',
  requireTeamMember,
  requireTeamAdmin,
  async (req: Request, res: Response) => {
    try {
      const invitationId = req.params.invitationId as string;

      const result = await InvitationService.revokeInvitation(
        invitationId,
        req.userId!,
        req
      );

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      res.json(successResponse({ message: 'Invitation revoked' }));
    } catch (error) {
      console.error('Revoke invitation error:', error);
      res.status(500).json(errorResponse('Failed to revoke invitation'));
    }
  }
);

/**
 * @route   POST /api/v1/teams/:teamId/invitations/:invitationId/resend
 * @desc    Resend invitation email
 * @access  Private (team admins only)
 */
teamInvitationRouter.post(
  '/:invitationId/resend',
  requireTeamMember,
  requireTeamAdmin,
  authRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const invitationId = req.params.invitationId as string;

      const result = await InvitationService.resendInvitation(
        invitationId,
        req.userId!,
        req
      );

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      res.json(
        successResponse({
          message: 'Invitation resent',
          expiresAt: result.data!.expires_at,
        })
      );
    } catch (error) {
      console.error('Resend invitation error:', error);
      res.status(500).json(errorResponse('Failed to resend invitation'));
    }
  }
);

export default router;
