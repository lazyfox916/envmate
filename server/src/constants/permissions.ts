/**
 * Role-Based Access Control (RBAC) Permissions
 * Defines all actions and their required roles
 */

import { TeamRole } from '../models/TeamMember';

// ===========================================
// Action Definitions
// ===========================================

/**
 * All possible actions in the system
 */
export enum Action {
  // Team actions
  TEAM_VIEW = 'team:view',
  TEAM_UPDATE = 'team:update',
  TEAM_DELETE = 'team:delete',
  TEAM_MANAGE_SETTINGS = 'team:manage_settings',

  // Team member actions
  MEMBER_LIST = 'member:list',
  MEMBER_INVITE = 'member:invite',
  MEMBER_REMOVE = 'member:remove',
  MEMBER_UPDATE_ROLE = 'member:update_role',

  // Project actions
  PROJECT_VIEW = 'project:view',
  PROJECT_CREATE = 'project:create',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',

  // Environment variable actions
  ENV_VIEW = 'env:view',
  ENV_VIEW_VALUES = 'env:view_values',
  ENV_CREATE = 'env:create',
  ENV_UPDATE = 'env:update',
  ENV_DELETE = 'env:delete',
  ENV_EXPORT = 'env:export',
  ENV_UPLOAD = 'env:upload',

  // Invitation actions
  INVITATION_SEND = 'invitation:send',
  INVITATION_REVOKE = 'invitation:revoke',
  INVITATION_LIST = 'invitation:list',

  // Audit actions
  AUDIT_VIEW = 'audit:view',
  AUDIT_EXPORT = 'audit:export',
}

// ===========================================
// Resource Types
// ===========================================

export enum ResourceType {
  TEAM = 'team',
  PROJECT = 'project',
  ENV_FILE = 'env_file',
  ENV_VARIABLE = 'env_variable',
  MEMBER = 'member',
  INVITATION = 'invitation',
  AUDIT_LOG = 'audit_log',
}

// ===========================================
// Permission Matrix
// ===========================================

/**
 * Maps each action to the roles that can perform it
 * Higher roles inherit lower role permissions
 */
export const PERMISSION_MATRIX: Record<Action, TeamRole[]> = {
  // Team actions
  [Action.TEAM_VIEW]: [TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER],
  [Action.TEAM_UPDATE]: [TeamRole.ADMIN],
  [Action.TEAM_DELETE]: [TeamRole.ADMIN], // Actually requires owner, handled separately
  [Action.TEAM_MANAGE_SETTINGS]: [TeamRole.ADMIN],

  // Member actions
  [Action.MEMBER_LIST]: [TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER],
  [Action.MEMBER_INVITE]: [TeamRole.ADMIN],
  [Action.MEMBER_REMOVE]: [TeamRole.ADMIN],
  [Action.MEMBER_UPDATE_ROLE]: [TeamRole.ADMIN],

  // Project actions
  [Action.PROJECT_VIEW]: [TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER],
  [Action.PROJECT_CREATE]: [TeamRole.ADMIN, TeamRole.EDITOR],
  [Action.PROJECT_UPDATE]: [TeamRole.ADMIN, TeamRole.EDITOR],
  [Action.PROJECT_DELETE]: [TeamRole.ADMIN],

  // Environment variable actions
  [Action.ENV_VIEW]: [TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER],
  [Action.ENV_VIEW_VALUES]: [TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER], // Could be restricted
  [Action.ENV_CREATE]: [TeamRole.ADMIN, TeamRole.EDITOR],
  [Action.ENV_UPDATE]: [TeamRole.ADMIN, TeamRole.EDITOR],
  [Action.ENV_DELETE]: [TeamRole.ADMIN, TeamRole.EDITOR],
  [Action.ENV_EXPORT]: [TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER],
  [Action.ENV_UPLOAD]: [TeamRole.ADMIN, TeamRole.EDITOR],

  // Invitation actions
  [Action.INVITATION_SEND]: [TeamRole.ADMIN],
  [Action.INVITATION_REVOKE]: [TeamRole.ADMIN],
  [Action.INVITATION_LIST]: [TeamRole.ADMIN],

  // Audit actions
  [Action.AUDIT_VIEW]: [TeamRole.ADMIN],
  [Action.AUDIT_EXPORT]: [TeamRole.ADMIN],
};

// ===========================================
// Role Hierarchy
// ===========================================

/**
 * Role hierarchy level (higher number = more permissions)
 */
export const ROLE_HIERARCHY: Record<TeamRole, number> = {
  [TeamRole.VIEWER]: 1,
  [TeamRole.EDITOR]: 2,
  [TeamRole.ADMIN]: 3,
};

/**
 * Get all roles at or above a certain level
 */
export function getRolesAtOrAbove(role: TeamRole): TeamRole[] {
  const level = ROLE_HIERARCHY[role];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, roleLevel]) => roleLevel >= level)
    .map(([roleName]) => roleName as TeamRole);
}

/**
 * Get all roles at or below a certain level
 */
export function getRolesAtOrBelow(role: TeamRole): TeamRole[] {
  const level = ROLE_HIERARCHY[role];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, roleLevel]) => roleLevel <= level)
    .map(([roleName]) => roleName as TeamRole);
}

// ===========================================
// Permission Checking Functions
// ===========================================

/**
 * Check if a role can perform an action
 */
export function canPerformAction(role: TeamRole, action: Action): boolean {
  const allowedRoles = PERMISSION_MATRIX[action];
  if (!allowedRoles) {
    return false;
  }
  return allowedRoles.includes(role);
}

/**
 * Check if a role has at least the specified role level
 */
export function hasRoleLevel(userRole: TeamRole, requiredRole: TeamRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if role is admin
 */
export function isAdmin(role: TeamRole): boolean {
  return role === TeamRole.ADMIN;
}

/**
 * Check if role can edit (admin or editor)
 */
export function canEdit(role: TeamRole): boolean {
  return role === TeamRole.ADMIN || role === TeamRole.EDITOR;
}

/**
 * Check if role can view (all roles)
 */
export function canView(role: TeamRole): boolean {
  return [TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER].includes(role);
}

/**
 * Get human-readable role name
 */
export function getRoleDisplayName(role: TeamRole): string {
  const displayNames: Record<TeamRole, string> = {
    [TeamRole.ADMIN]: 'Administrator',
    [TeamRole.EDITOR]: 'Editor',
    [TeamRole.VIEWER]: 'Viewer',
  };
  return displayNames[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: TeamRole): string {
  const descriptions: Record<TeamRole, string> = {
    [TeamRole.ADMIN]: 'Full access: manage team settings, members, and all projects',
    [TeamRole.EDITOR]: 'Can create and edit projects and environment variables',
    [TeamRole.VIEWER]: 'Read-only access to projects and environment variables',
  };
  return descriptions[role] || '';
}

/**
 * Get all actions a role can perform
 */
export function getActionsForRole(role: TeamRole): Action[] {
  return Object.entries(PERMISSION_MATRIX)
    .filter(([, allowedRoles]) => allowedRoles.includes(role))
    .map(([action]) => action as Action);
}

/**
 * Get permission denied message
 */
export function getPermissionDeniedMessage(action: Action, userRole: TeamRole): string {
  const requiredRoles = PERMISSION_MATRIX[action];
  if (!requiredRoles || requiredRoles.length === 0) {
    return 'This action is not allowed';
  }

  const actionName = action.replace(':', ' ').replace('_', ' ');
  const requiredRoleNames = requiredRoles.map(getRoleDisplayName).join(' or ');
  const userRoleName = getRoleDisplayName(userRole);

  return `You need ${requiredRoleNames} role to ${actionName}. Your current role is ${userRoleName}.`;
}

// ===========================================
// Default Role Configuration
// ===========================================

/**
 * Default role for new team members
 */
export const DEFAULT_MEMBER_ROLE = TeamRole.VIEWER;

/**
 * Role assigned to team creators
 */
export const TEAM_CREATOR_ROLE = TeamRole.ADMIN;

/**
 * Roles that can be assigned to members (excludes admin from self-demotion edge case)
 */
export const ASSIGNABLE_ROLES = [TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER];

// ===========================================
// Exports
// ===========================================

export default {
  Action,
  ResourceType,
  PERMISSION_MATRIX,
  ROLE_HIERARCHY,
  canPerformAction,
  hasRoleLevel,
  isAdmin,
  canEdit,
  canView,
  getRoleDisplayName,
  getRoleDescription,
  getActionsForRole,
  getPermissionDeniedMessage,
  getRolesAtOrAbove,
  getRolesAtOrBelow,
  DEFAULT_MEMBER_ROLE,
  TEAM_CREATOR_ROLE,
  ASSIGNABLE_ROLES,
};
