/**
 * Role-Based Access Control (RBAC) Middleware
 * Provides enhanced permission checking with audit logging
 */

import { Request, Response, NextFunction } from 'express';
import { TeamMember, Team, Project } from '../models';
import { TeamRole } from '../models/TeamMember';
import { errorResponse } from '../utils/response';
import {
  Action,
  canPerformAction,
  getPermissionDeniedMessage,
  getRoleDisplayName,
} from '../constants/permissions';
import { AuditService } from '../services/AuditService';
import { AuditAction, AuditEntityType, AuditStatus } from '../models/AuditLog';

// ===========================================
// Extended Request Interface
// ===========================================

declare global {
  namespace Express {
    interface Request {
      // Team context
      teamId?: string;
      teamRole?: TeamRole;
      teamMembership?: TeamMember;
      team?: Team;
      // Project context
      project?: Project;
      projectTeamId?: string;
      projectTeamRole?: TeamRole;
    }
  }
}

// ===========================================
// Permission Context Interface
// ===========================================

export interface PermissionContext {
  userId?: string;
  teamId?: string;
  projectId?: string;
  role?: TeamRole;
  action: Action;
  resourceType?: string;
  resourceId?: string;
}

// ===========================================
// Core RBAC Middleware
// ===========================================

/**
 * Check if user has permission to perform an action
 * Logs denied attempts to audit log
 */
export function requirePermission(action: Action, resourceType?: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;
      const teamRole = req.teamRole || req.projectTeamRole;
      const teamId = req.teamId || req.projectTeamId;
      const resourceId = (req.params.projectId || req.params.teamId || req.params.envFileId) as string | undefined;

      if (!userId) {
        res.status(401).json(errorResponse('Authentication required'));
        return;
      }

      if (!teamRole) {
        res.status(403).json(errorResponse('Access denied: no role context'));
        return;
      }

      // Check permission
      const hasPermission = canPerformAction(teamRole, action);

      if (!hasPermission) {
        // Log permission denied event
        await AuditService.logFromRequest(req, {
          action: AuditAction.PERMISSION_DENIED,
          entityType: (resourceType as AuditEntityType) || AuditEntityType.SYSTEM,
          entityId: resourceId,
          description: `Permission denied for action: ${action}`,
          metadata: {
            attemptedAction: action,
            userRole: teamRole,
            teamId,
            path: req.path,
            method: req.method,
          },
          status: AuditStatus.FAILURE,
        });

        const message = getPermissionDeniedMessage(action, teamRole);
        res.status(403).json(errorResponse(message));
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json(errorResponse('Failed to verify permissions'));
    }
  };
}

// ===========================================
// Team Membership Middleware
// ===========================================

/**
 * Load team membership and attach to request
 * Required before any team-scoped permission check
 */
export const loadTeamMembership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teamId = req.params.teamId as string;
    const userId = req.userId;

    if (!teamId) {
      res.status(400).json(errorResponse('Team ID is required'));
      return;
    }

    if (!userId) {
      res.status(401).json(errorResponse('Authentication required'));
      return;
    }

    // Load membership with team
    const membership = await TeamMember.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!membership) {
      // Log unauthorized access attempt
      await AuditService.logUnauthorizedAccess(
        req,
        `team:${teamId}`
      );

      res.status(403).json(errorResponse('You are not a member of this team'));
      return;
    }

    // Load team details
    const team = await Team.findByPk(teamId);
    if (!team) {
      res.status(404).json(errorResponse('Team not found'));
      return;
    }

    // Attach to request
    req.teamId = teamId;
    req.teamRole = membership.role;
    req.teamMembership = membership;
    req.team = team;

    next();
  } catch (error) {
    console.error('Team membership load error:', error);
    res.status(500).json(errorResponse('Failed to verify team membership'));
  }
};

/**
 * Require team membership (alias for consistency)
 */
export const requireTeamMember = loadTeamMembership;

// ===========================================
// Role-Specific Middleware
// ===========================================

/**
 * Require admin role for team operations
 */
export const requireAdmin = requirePermission(Action.TEAM_MANAGE_SETTINGS);

/**
 * Require at least editor role
 */
export const requireEditor = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const role = req.teamRole || req.projectTeamRole;

  if (!role) {
    res.status(403).json(errorResponse('Access denied: no role context'));
    return;
  }

  if (role === TeamRole.VIEWER) {
    res.status(403).json(
      errorResponse(`Editor privileges required. Your role is ${getRoleDisplayName(role)}.`)
    );
    return;
  }

  next();
};

/**
 * Ensure user is the team owner (for destructive operations)
 */
export const requireTeamOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teamId = (req.teamId || req.params.teamId) as string;
    const userId = req.userId;

    if (!teamId || !userId) {
      res.status(400).json(errorResponse('Team context required'));
      return;
    }

    const team = req.team || await Team.findByPk(teamId);

    if (!team) {
      res.status(404).json(errorResponse('Team not found'));
      return;
    }

    if (team.owner_id !== userId) {
      // Log attempted destructive action
      await AuditService.logFromRequest(req, {
        action: AuditAction.PERMISSION_DENIED,
        entityType: AuditEntityType.TEAM,
        entityId: teamId,
        description: 'Attempted team operation requiring owner privileges',
        metadata: {
          attemptedAction: 'team_owner_operation',
          path: req.path,
          method: req.method,
        },
        status: AuditStatus.FAILURE,
      });

      res.status(403).json(errorResponse('Only the team owner can perform this action'));
      return;
    }

    next();
  } catch (error) {
    console.error('Owner check error:', error);
    res.status(500).json(errorResponse('Failed to verify ownership'));
  }
};

// ===========================================
// Project Access Middleware
// ===========================================

/**
 * Load project and verify team membership
 */
export const loadProjectAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.userId;

    if (!projectId) {
      res.status(400).json(errorResponse('Project ID is required'));
      return;
    }

    if (!userId) {
      res.status(401).json(errorResponse('Authentication required'));
      return;
    }

    // Load project with team
    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name', 'owner_id'],
        },
      ],
    });

    if (!project) {
      res.status(404).json(errorResponse('Project not found'));
      return;
    }

    // Check team membership
    const membership = await TeamMember.findOne({
      where: { team_id: project.team_id, user_id: userId },
    });

    if (!membership) {
      // Log unauthorized access attempt
      await AuditService.logUnauthorizedAccess(
        req,
        `project:${projectId}`
      );

      res.status(403).json(errorResponse('You do not have access to this project'));
      return;
    }

    // Attach context
    req.project = project;
    req.projectTeamId = project.team_id;
    req.projectTeamRole = membership.role;

    next();
  } catch (error) {
    console.error('Project access check error:', error);
    res.status(500).json(errorResponse('Failed to verify project access'));
  }
};

/**
 * Require project access (alias)
 */
export const requireProjectAccess = loadProjectAccess;

// ===========================================
// Action-Specific Middleware Factories
// ===========================================

/**
 * Create middleware for specific team actions
 */
export function requireTeamAction(action: Action) {
  return [loadTeamMembership, requirePermission(action, AuditEntityType.TEAM)];
}

/**
 * Create middleware for specific project actions
 */
export function requireProjectAction(action: Action) {
  return [loadProjectAccess, requirePermission(action, AuditEntityType.PROJECT)];
}

/**
 * Create middleware for env variable actions
 */
export function requireEnvAction(action: Action) {
  return [loadProjectAccess, requirePermission(action, AuditEntityType.ENV_VARIABLE)];
}

// ===========================================
// Privilege Escalation Prevention
// ===========================================

/**
 * Prevent users from assigning roles higher than their own
 */
export const preventPrivilegeEscalation = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const userRole = req.teamRole;
  const targetRole = req.body?.role;

  if (!userRole || !targetRole) {
    next();
    return;
  }

  // Only admins can assign any role
  if (userRole !== TeamRole.ADMIN) {
    res.status(403).json(
      errorResponse('Only administrators can change member roles')
    );
    return;
  }

  // Validate target role is valid
  if (!Object.values(TeamRole).includes(targetRole)) {
    res.status(400).json(errorResponse('Invalid role specified'));
    return;
  }

  next();
};

/**
 * Prevent last admin from being demoted/removed
 */
export const protectLastAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teamId = req.teamId || req.params.teamId;
    const targetUserId = req.params.userId;
    const newRole = req.body?.role;

    if (!teamId) {
      next();
      return;
    }

    // Only check when demoting from admin or removing a member
    const isRoleChange = newRole && newRole !== TeamRole.ADMIN;
    const isRemoval = req.method === 'DELETE' && targetUserId;

    if (!isRoleChange && !isRemoval) {
      next();
      return;
    }

    // Get target membership
    const targetMembership = await TeamMember.findOne({
      where: { team_id: teamId, user_id: targetUserId },
    });

    if (!targetMembership || targetMembership.role !== TeamRole.ADMIN) {
      next();
      return;
    }

    // Count admins
    const adminCount = await TeamMember.count({
      where: { team_id: teamId, role: TeamRole.ADMIN },
    });

    if (adminCount <= 1) {
      res.status(400).json(
        errorResponse('Cannot remove or demote the last administrator. Promote another member first.')
      );
      return;
    }

    next();
  } catch (error) {
    console.error('Last admin protection error:', error);
    res.status(500).json(errorResponse('Failed to verify admin count'));
  }
};

// ===========================================
// Default Exports
// ===========================================

export default {
  requirePermission,
  loadTeamMembership,
  requireTeamMember,
  requireAdmin,
  requireEditor,
  requireTeamOwner,
  loadProjectAccess,
  requireProjectAccess,
  requireTeamAction,
  requireProjectAction,
  requireEnvAction,
  preventPrivilegeEscalation,
  protectLastAdmin,
};
