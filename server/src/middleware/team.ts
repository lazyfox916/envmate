import { Request, Response, NextFunction } from 'express';
import { TeamMember } from '../models';
import { TeamRole } from '../models/TeamMember';
import { errorResponse } from '../utils/response';
import { AuditService } from '../services/AuditService';
import { AuditAction, AuditEntityType, AuditStatus } from '../models/AuditLog';
import { getRoleDisplayName } from '../constants/permissions';

/**
 * Extend Express Request to include team context
 */
declare global {
  namespace Express {
    interface Request {
      teamId?: string;
      teamRole?: TeamRole;
      teamMembership?: TeamMember;
    }
  }
}

/**
 * Middleware to require team membership
 * Extracts teamId from params and verifies user is a member
 */
export const requireTeamMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { teamId } = req.params;
    const userId = req.userId;

    if (!teamId) {
      res.status(400).json(errorResponse('Team ID is required'));
      return;
    }

    if (!userId) {
      res.status(401).json(errorResponse('Authentication required'));
      return;
    }

    // Check membership
    const membership = await TeamMember.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!membership) {
      // Log unauthorized access attempt
      await AuditService.logFromRequest(req, {
        action: AuditAction.UNAUTHORIZED_ACCESS,
        entityType: AuditEntityType.TEAM,
        entityId: teamId as string,
        description: 'User attempted to access team without membership',
        status: AuditStatus.FAILURE,
      });

      res.status(403).json(errorResponse('You are not a member of this team'));
      return;
    }

    // Attach team context to request
    req.teamId = teamId as string;
    req.teamRole = membership.role;
    req.teamMembership = membership;

    next();
  } catch (error) {
    console.error('Team membership check error:', error);
    res.status(500).json(errorResponse('Failed to verify team membership'));
  }
};

/**
 * Middleware to require team admin role
 * Must be used after requireTeamMember
 */
export const requireTeamAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.teamRole) {
    res.status(403).json(errorResponse('Team context not available'));
    return;
  }

  if (req.teamRole !== TeamRole.ADMIN) {
    // Log permission denied
    await AuditService.logFromRequest(req, {
      action: AuditAction.PERMISSION_DENIED,
      entityType: AuditEntityType.TEAM,
      entityId: req.teamId,
      description: `Admin privileges required. User role: ${getRoleDisplayName(req.teamRole)}`,
      metadata: {
        requiredRole: TeamRole.ADMIN,
        userRole: req.teamRole,
        path: req.path,
        method: req.method,
      },
      status: AuditStatus.FAILURE,
    });

    res.status(403).json(errorResponse('Admin privileges required'));
    return;
  }

  next();
};

/**
 * Middleware to require at least editor role
 * Must be used after requireTeamMember
 */
export const requireTeamEditor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.teamRole) {
    res.status(403).json(errorResponse('Team context not available'));
    return;
  }

  if (req.teamRole !== TeamRole.ADMIN && req.teamRole !== TeamRole.EDITOR) {
    // Log permission denied
    await AuditService.logFromRequest(req, {
      action: AuditAction.PERMISSION_DENIED,
      entityType: AuditEntityType.TEAM,
      entityId: req.teamId,
      description: `Editor privileges required. User role: ${getRoleDisplayName(req.teamRole)}`,
      metadata: {
        requiredRole: 'editor or admin',
        userRole: req.teamRole,
        path: req.path,
        method: req.method,
      },
      status: AuditStatus.FAILURE,
    });

    res.status(403).json(errorResponse('Editor privileges required'));
    return;
  }

  next();
};

/**
 * Factory function to check for specific roles
 */
export const requireTeamRole = (...allowedRoles: TeamRole[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.teamRole) {
      res.status(403).json(errorResponse('Team context not available'));
      return;
    }

    if (!allowedRoles.includes(req.teamRole)) {
      res.status(403).json(
        errorResponse(`Required role: ${allowedRoles.join(' or ')}`)
      );
      return;
    }

    next();
  };
};
