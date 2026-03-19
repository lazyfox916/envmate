import { Router, Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { authenticate, validate } from '../middleware/auth';
import { requireTeamMember, requireTeamAdmin } from '../middleware/team';
import * as TeamService from '../services/TeamService';
import {
  createTeamSchema,
  updateTeamSchema,
  updateMemberRoleSchema,
} from '../validators/team';

const router = Router();

// All team routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/teams
 * @desc    Create a new team
 * @access  Private
 */
router.post(
  '/',
  validate(createTeamSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await TeamService.createTeam(req.userId!, req.body);

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      res.status(201).json(successResponse(result.data));
    } catch (error) {
      console.error('Create team error:', error);
      res.status(500).json(errorResponse('Failed to create team'));
    }
  }
);

/**
 * @route   GET /api/v1/teams
 * @desc    Get all teams for current user
 * @access  Private
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await TeamService.getUserTeams(req.userId!);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error!));
      return;
    }

    res.json(successResponse(result.data));
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json(errorResponse('Failed to get teams'));
  }
});

/**
 * @route   GET /api/v1/teams/:teamId
 * @desc    Get team details
 * @access  Private (team members only)
 */
router.get('/:teamId', async (req: Request, res: Response) => {
  try {
    const result = await TeamService.getTeamById(req.params.teamId as string, req.userId!);

    if (!result.success) {
      res.status(result.error === 'Team not found' ? 404 : 403).json(
        errorResponse(result.error!)
      );
      return;
    }

    res.json(successResponse(result.data));
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json(errorResponse('Failed to get team'));
  }
});

/**
 * @route   PATCH /api/v1/teams/:teamId
 * @desc    Update team
 * @access  Private (team admins only)
 */
router.patch(
  '/:teamId',
  requireTeamMember,
  requireTeamAdmin,
  validate(updateTeamSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await TeamService.updateTeam(
        req.params.teamId as string,
        req.userId!,
        req.body
      );

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      res.json(successResponse(result.data));
    } catch (error) {
      console.error('Update team error:', error);
      res.status(500).json(errorResponse('Failed to update team'));
    }
  }
);

/**
 * @route   DELETE /api/v1/teams/:teamId
 * @desc    Delete team
 * @access  Private (team owner only)
 */
router.delete('/:teamId', requireTeamMember, async (req: Request, res: Response) => {
  try {
    const result = await TeamService.deleteTeam(req.params.teamId as string, req.userId!);

    if (!result.success) {
      res.status(result.error === 'Team not found' ? 404 : 403).json(
        errorResponse(result.error!)
      );
      return;
    }

    res.json(successResponse({ message: 'Team deleted successfully' }));
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json(errorResponse('Failed to delete team'));
  }
});

/**
 * @route   GET /api/v1/teams/:teamId/members
 * @desc    Get team members
 * @access  Private (team members only)
 */
router.get(
  '/:teamId/members',
  requireTeamMember,
  async (req: Request, res: Response) => {
    try {
      const result = await TeamService.getTeamMembers(
        req.params.teamId as string,
        req.userId!
      );

      if (!result.success) {
        res.status(403).json(errorResponse(result.error!));
        return;
      }

      res.json(successResponse(result.data));
    } catch (error) {
      console.error('Get team members error:', error);
      res.status(500).json(errorResponse('Failed to get team members'));
    }
  }
);

/**
 * @route   DELETE /api/v1/teams/:teamId/members/:userId
 * @desc    Remove member from team
 * @access  Private (team admins only)
 */
router.delete(
  '/:teamId/members/:userId',
  requireTeamMember,
  requireTeamAdmin,
  async (req: Request, res: Response) => {
    try {
      const result = await TeamService.removeMember(
        req.params.teamId as string,
        req.params.userId as string,
        req.userId!
      );

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      res.json(successResponse({ message: 'Member removed successfully' }));
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json(errorResponse('Failed to remove member'));
    }
  }
);

/**
 * @route   PATCH /api/v1/teams/:teamId/members/:userId/role
 * @desc    Update member role
 * @access  Private (team admins only)
 */
router.patch(
  '/:teamId/members/:userId/role',
  requireTeamMember,
  requireTeamAdmin,
  validate(updateMemberRoleSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await TeamService.updateMemberRole(
        req.params.teamId as string,
        req.params.userId as string,
        req.userId!,
        req.body
      );

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      res.json(successResponse(result.data));
    } catch (error) {
      console.error('Update member role error:', error);
      res.status(500).json(errorResponse('Failed to update member role'));
    }
  }
);

/**
 * @route   POST /api/v1/teams/:teamId/leave
 * @desc    Leave a team
 * @access  Private (team members only)
 */
router.post(
  '/:teamId/leave',
  requireTeamMember,
  async (req: Request, res: Response) => {
    try {
      const result = await TeamService.leaveTeam(req.params.teamId as string, req.userId!);

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      res.json(successResponse({ message: 'Left team successfully' }));
    } catch (error) {
      console.error('Leave team error:', error);
      res.status(500).json(errorResponse('Failed to leave team'));
    }
  }
);

export default router;
