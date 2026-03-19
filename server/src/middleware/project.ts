import { Request, Response, NextFunction } from 'express';
import { Project, TeamMember, Team } from '../models';
import { TeamRole } from '../models/TeamMember';
import { errorResponse } from '../utils/response';
import { AuditService } from '../services/AuditService';
import { AuditAction, AuditEntityType, AuditStatus } from '../models/AuditLog';
import { getRoleDisplayName } from '../constants/permissions';

/**
 * Extend Express Request to include project context
 */
declare global {
  namespace Express {
    interface Request {
      project?: Project;
      projectTeamId?: string;
      projectTeamRole?: TeamRole;
    }
  }
}

/**
 * Middleware to load project and verify team membership
 * Extracts projectId from params, loads project, and verifies user is team member
 */
export const requireProjectAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId } = req.params;
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
    const project = await Project.findByPk(projectId as string, {
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
      await AuditService.logFromRequest(req, {
        action: AuditAction.UNAUTHORIZED_ACCESS,
        entityType: AuditEntityType.PROJECT,
        entityId: projectId as string,
        description: 'User attempted to access project without team membership',
        metadata: { projectId, teamId: project.team_id },
        status: AuditStatus.FAILURE,
      });

      res.status(403).json(errorResponse('You do not have access to this project'));
      return;
    }

    // Attach context to request
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
 * Middleware to require editor access for project operations
 * Must be used after requireProjectAccess
 */
export const requireProjectEditor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.projectTeamRole) {
    res.status(403).json(errorResponse('Project context not available'));
    return;
  }

  if (req.projectTeamRole !== TeamRole.ADMIN && req.projectTeamRole !== TeamRole.EDITOR) {
    // Log permission denied
    await AuditService.logFromRequest(req, {
      action: AuditAction.PERMISSION_DENIED,
      entityType: AuditEntityType.PROJECT,
      entityId: req.project?.id,
      description: `Editor privileges required for project. User role: ${getRoleDisplayName(req.projectTeamRole)}`,
      metadata: {
        requiredRole: 'editor or admin',
        userRole: req.projectTeamRole,
        projectId: req.project?.id,
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
 * Middleware to require admin access for project operations
 * Must be used after requireProjectAccess
 */
export const requireProjectAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.projectTeamRole) {
    res.status(403).json(errorResponse('Project context not available'));
    return;
  }

  if (req.projectTeamRole !== TeamRole.ADMIN) {
    // Log permission denied
    await AuditService.logFromRequest(req, {
      action: AuditAction.PERMISSION_DENIED,
      entityType: AuditEntityType.PROJECT,
      entityId: req.project?.id,
      description: `Admin privileges required for project. User role: ${getRoleDisplayName(req.projectTeamRole)}`,
      metadata: {
        requiredRole: TeamRole.ADMIN,
        userRole: req.projectTeamRole,
        projectId: req.project?.id,
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
