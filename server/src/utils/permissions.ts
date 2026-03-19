/**
 * Permission Helper Utilities
 * Reusable functions for permission checking across the application
 */

import { TeamRole } from '../models/TeamMember';
import { Action, PERMISSION_MATRIX, ROLE_HIERARCHY } from '../constants/permissions';

// ===========================================
// Permission Check Helpers
// ===========================================

/**
 * Check if a user can perform a specific action
 */
export function hasPermission(role: TeamRole, action: Action): boolean {
  const allowedRoles = PERMISSION_MATRIX[action];
  return allowedRoles?.includes(role) ?? false;
}

/**
 * Check if a user has at least the specified role level
 */
export function hasMinimumRole(userRole: TeamRole, requiredRole: TeamRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check multiple permissions at once
 * Returns true only if ALL permissions are granted
 */
export function hasAllPermissions(role: TeamRole, actions: Action[]): boolean {
  return actions.every(action => hasPermission(role, action));
}

/**
 * Check multiple permissions at once
 * Returns true if ANY permission is granted
 */
export function hasAnyPermission(role: TeamRole, actions: Action[]): boolean {
  return actions.some(action => hasPermission(role, action));
}

// ===========================================
// Role Comparison Helpers
// ===========================================

/**
 * Check if first role is higher than second role
 */
export function isHigherRole(role1: TeamRole, role2: TeamRole): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}

/**
 * Check if first role is higher than or equal to second role
 */
export function isHigherOrEqualRole(role1: TeamRole, role2: TeamRole): boolean {
  return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2];
}

/**
 * Get the highest role from a list
 */
export function getHighestRole(roles: TeamRole[]): TeamRole | null {
  if (roles.length === 0) return null;
  
  return roles.reduce((highest, current) => 
    ROLE_HIERARCHY[current] > ROLE_HIERARCHY[highest] ? current : highest
  );
}

/**
 * Sort roles by hierarchy (highest first)
 */
export function sortRolesByHierarchy(roles: TeamRole[]): TeamRole[] {
  return [...roles].sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]);
}

// ===========================================
// Capability Helpers
// ===========================================

/**
 * Get capabilities object for a role
 * Useful for frontend permission-based rendering
 */
export function getRoleCapabilities(role: TeamRole): Record<string, boolean> {
  return {
    // Team capabilities
    canViewTeam: hasPermission(role, Action.TEAM_VIEW),
    canUpdateTeam: hasPermission(role, Action.TEAM_UPDATE),
    canDeleteTeam: hasPermission(role, Action.TEAM_DELETE),
    canManageSettings: hasPermission(role, Action.TEAM_MANAGE_SETTINGS),

    // Member capabilities
    canListMembers: hasPermission(role, Action.MEMBER_LIST),
    canInviteMembers: hasPermission(role, Action.MEMBER_INVITE),
    canRemoveMembers: hasPermission(role, Action.MEMBER_REMOVE),
    canUpdateRoles: hasPermission(role, Action.MEMBER_UPDATE_ROLE),

    // Project capabilities
    canViewProjects: hasPermission(role, Action.PROJECT_VIEW),
    canCreateProjects: hasPermission(role, Action.PROJECT_CREATE),
    canUpdateProjects: hasPermission(role, Action.PROJECT_UPDATE),
    canDeleteProjects: hasPermission(role, Action.PROJECT_DELETE),

    // Environment capabilities
    canViewEnv: hasPermission(role, Action.ENV_VIEW),
    canViewEnvValues: hasPermission(role, Action.ENV_VIEW_VALUES),
    canCreateEnv: hasPermission(role, Action.ENV_CREATE),
    canUpdateEnv: hasPermission(role, Action.ENV_UPDATE),
    canDeleteEnv: hasPermission(role, Action.ENV_DELETE),
    canExportEnv: hasPermission(role, Action.ENV_EXPORT),
    canUploadEnv: hasPermission(role, Action.ENV_UPLOAD),

    // Invitation capabilities
    canSendInvitations: hasPermission(role, Action.INVITATION_SEND),
    canRevokeInvitations: hasPermission(role, Action.INVITATION_REVOKE),
    canListInvitations: hasPermission(role, Action.INVITATION_LIST),

    // Audit capabilities
    canViewAuditLogs: hasPermission(role, Action.AUDIT_VIEW),
    canExportAuditLogs: hasPermission(role, Action.AUDIT_EXPORT),

    // General capabilities
    isAdmin: role === TeamRole.ADMIN,
    canEdit: role === TeamRole.ADMIN || role === TeamRole.EDITOR,
    canView: true, // All roles can view
  };
}

/**
 * Check if role can manage other roles
 * Typically only admins can manage roles
 */
export function canManageRole(managerRole: TeamRole, targetRole: TeamRole): boolean {
  // Must be admin to manage any role
  if (managerRole !== TeamRole.ADMIN) {
    return false;
  }
  
  // Can manage any role
  return true;
}

/**
 * Check if role can assign a specific role to another user
 */
export function canAssignRole(assignerRole: TeamRole, roleToAssign: TeamRole): boolean {
  // Only admins can assign roles
  if (assignerRole !== TeamRole.ADMIN) {
    return false;
  }
  
  // Admin can assign any role
  return Object.values(TeamRole).includes(roleToAssign);
}

// ===========================================
// Team-Specific Helpers
// ===========================================

export interface TeamMemberInfo {
  userId: string;
  role: TeamRole;
  isOwner: boolean;
}

/**
 * Check if a user can remove another user from team
 */
export function canRemoveMember(
  actor: TeamMemberInfo,
  target: TeamMemberInfo,
  totalAdmins: number
): { allowed: boolean; reason?: string } {
  // Must be admin
  if (actor.role !== TeamRole.ADMIN) {
    return { allowed: false, reason: 'Only administrators can remove members' };
  }
  
  // Cannot remove self (use leave team instead)
  if (actor.userId === target.userId) {
    return { allowed: false, reason: 'Use "Leave Team" to remove yourself' };
  }
  
  // Cannot remove owner
  if (target.isOwner) {
    return { allowed: false, reason: 'Cannot remove the team owner' };
  }
  
  // Cannot remove last admin (unless they're being demoted first)
  if (target.role === TeamRole.ADMIN && totalAdmins <= 1) {
    return { allowed: false, reason: 'Cannot remove the last administrator' };
  }
  
  return { allowed: true };
}

/**
 * Check if a user can change another user's role
 */
export function canChangeRole(
  actor: TeamMemberInfo,
  target: TeamMemberInfo,
  newRole: TeamRole,
  totalAdmins: number
): { allowed: boolean; reason?: string } {
  // Must be admin
  if (actor.role !== TeamRole.ADMIN) {
    return { allowed: false, reason: 'Only administrators can change roles' };
  }
  
  // Cannot change own role
  if (actor.userId === target.userId) {
    return { allowed: false, reason: 'You cannot change your own role' };
  }
  
  // Cannot change owner's role
  if (target.isOwner) {
    return { allowed: false, reason: 'Cannot change the team owner\'s role' };
  }
  
  // Cannot demote last admin
  if (target.role === TeamRole.ADMIN && newRole !== TeamRole.ADMIN && totalAdmins <= 1) {
    return { allowed: false, reason: 'Cannot demote the last administrator' };
  }
  
  return { allowed: true };
}

/**
 * Check if a user can leave a team
 */
export function canLeaveTeam(
  member: TeamMemberInfo,
  totalAdmins: number
): { allowed: boolean; reason?: string } {
  // Owner cannot leave (must transfer ownership or delete team)
  if (member.isOwner) {
    return { 
      allowed: false, 
      reason: 'Team owner cannot leave. Transfer ownership or delete the team.' 
    };
  }
  
  // Last admin cannot leave (must promote someone first)
  if (member.role === TeamRole.ADMIN && totalAdmins <= 1) {
    return { 
      allowed: false, 
      reason: 'Last administrator cannot leave. Promote another member first.' 
    };
  }
  
  return { allowed: true };
}

// ===========================================
// Export Default
// ===========================================

export default {
  hasPermission,
  hasMinimumRole,
  hasAllPermissions,
  hasAnyPermission,
  isHigherRole,
  isHigherOrEqualRole,
  getHighestRole,
  sortRolesByHierarchy,
  getRoleCapabilities,
  canManageRole,
  canAssignRole,
  canRemoveMember,
  canChangeRole,
  canLeaveTeam,
};
