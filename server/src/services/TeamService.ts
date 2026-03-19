import { Op } from 'sequelize';
import { Team, TeamMember, User } from '../models';
import { TeamRole } from '../models/TeamMember';
import { CreateTeamInput, UpdateTeamInput, UpdateMemberRoleInput } from '../validators/team';

/**
 * Service result type
 */
export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Safe team response (for API)
 */
export interface SafeTeam {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: Date;
  member_count?: number;
  user_role?: TeamRole;
}

/**
 * Safe team member response
 */
export interface SafeTeamMember {
  id: string;
  user_id: string;
  role: TeamRole;
  joined_at: Date;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Convert Team model to safe response
 */
const toSafeTeam = (team: Team, memberCount?: number, userRole?: TeamRole): SafeTeam => ({
  id: team.id,
  name: team.name,
  description: team.description,
  owner_id: team.owner_id,
  created_at: team.created_at,
  ...(memberCount !== undefined && { member_count: memberCount }),
  ...(userRole && { user_role: userRole }),
});

/**
 * Create a new team
 */
export const createTeam = async (
  userId: string,
  input: CreateTeamInput
): Promise<ServiceResult<{ team: SafeTeam }>> => {
  const { name, description } = input;

  // Create team with user as owner
  const team = await Team.create({
    name,
    description: description || null,
    owner_id: userId,
  });

  // Add creator as admin member
  await TeamMember.create({
    team_id: team.id,
    user_id: userId,
    role: TeamRole.ADMIN,
  });

  return {
    success: true,
    data: {
      team: toSafeTeam(team, 1, TeamRole.ADMIN),
    },
  };
};

/**
 * Get all teams for a user
 */
export const getUserTeams = async (
  userId: string
): Promise<ServiceResult<{ teams: SafeTeam[] }>> => {
  // Get all team memberships for user
  const memberships = await TeamMember.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Team,
        as: 'team',
        where: { deleted_at: null },
      },
    ],
  });

  const teams: SafeTeam[] = [];

  for (const membership of memberships) {
    const team = (membership as TeamMember & { team: Team }).team;
    if (team) {
      // Get member count for each team
      const memberCount = await TeamMember.count({
        where: { team_id: team.id },
      });

      teams.push(toSafeTeam(team, memberCount, membership.role));
    }
  }

  return {
    success: true,
    data: { teams },
  };
};

/**
 * Get team by ID
 */
export const getTeamById = async (
  teamId: string,
  userId: string
): Promise<ServiceResult<{ team: SafeTeam; membership: SafeTeamMember }>> => {
  // Get team
  const team = await Team.findByPk(teamId);
  if (!team) {
    return { success: false, error: 'Team not found' };
  }

  // Get user's membership
  const membership = await TeamMember.findOne({
    where: { team_id: teamId, user_id: userId },
  });

  if (!membership) {
    return { success: false, error: 'You are not a member of this team' };
  }

  // Get member count
  const memberCount = await TeamMember.count({
    where: { team_id: teamId },
  });

  return {
    success: true,
    data: {
      team: toSafeTeam(team, memberCount, membership.role),
      membership: {
        id: membership.id,
        user_id: membership.user_id,
        role: membership.role,
        joined_at: membership.joined_at,
      },
    },
  };
};

/**
 * Update team
 */
export const updateTeam = async (
  teamId: string,
  userId: string,
  input: UpdateTeamInput
): Promise<ServiceResult<{ team: SafeTeam }>> => {
  // Get team
  const team = await Team.findByPk(teamId);
  if (!team) {
    return { success: false, error: 'Team not found' };
  }

  // Check if user is admin
  const membership = await TeamMember.findOne({
    where: { team_id: teamId, user_id: userId },
  });

  if (!membership || membership.role !== TeamRole.ADMIN) {
    return { success: false, error: 'Only team admins can update team settings' };
  }

  // Update team
  await team.update({
    ...(input.name && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
  });

  const memberCount = await TeamMember.count({
    where: { team_id: teamId },
  });

  return {
    success: true,
    data: {
      team: toSafeTeam(team, memberCount, membership.role),
    },
  };
};

/**
 * Delete team (soft delete)
 */
export const deleteTeam = async (
  teamId: string,
  userId: string
): Promise<ServiceResult> => {
  // Get team
  const team = await Team.findByPk(teamId);
  if (!team) {
    return { success: false, error: 'Team not found' };
  }

  // Only owner can delete team
  if (team.owner_id !== userId) {
    return { success: false, error: 'Only team owner can delete the team' };
  }

  // Soft delete team
  await team.destroy();

  return { success: true };
};

/**
 * Get team members
 */
export const getTeamMembers = async (
  teamId: string,
  userId: string
): Promise<ServiceResult<{ members: SafeTeamMember[] }>> => {
  // Verify user is member
  const userMembership = await TeamMember.findOne({
    where: { team_id: teamId, user_id: userId },
  });

  if (!userMembership) {
    return { success: false, error: 'You are not a member of this team' };
  }

  // Get all members with user details
  const members = await TeamMember.findAll({
    where: { team_id: teamId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'name'],
      },
    ],
    order: [
      ['role', 'ASC'], // admins first
      ['joined_at', 'ASC'],
    ],
  });

  const safeMumbers: SafeTeamMember[] = members.map((m) => {
    const member = m as TeamMember & { user: User };
    return {
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      user: member.user
        ? {
            id: member.user.id,
            email: member.user.email,
            name: member.user.name,
          }
        : undefined,
    };
  });

  return {
    success: true,
    data: { members: safeMumbers },
  };
};

/**
 * Remove member from team
 */
export const removeMember = async (
  teamId: string,
  targetUserId: string,
  requestingUserId: string
): Promise<ServiceResult> => {
  // Get team
  const team = await Team.findByPk(teamId);
  if (!team) {
    return { success: false, error: 'Team not found' };
  }

  // Check if requesting user is admin
  const requesterMembership = await TeamMember.findOne({
    where: { team_id: teamId, user_id: requestingUserId },
  });

  if (!requesterMembership || requesterMembership.role !== TeamRole.ADMIN) {
    return { success: false, error: 'Only team admins can remove members' };
  }

  // Cannot remove team owner
  if (targetUserId === team.owner_id) {
    return { success: false, error: 'Cannot remove team owner' };
  }

  // Get target membership
  const targetMembership = await TeamMember.findOne({
    where: { team_id: teamId, user_id: targetUserId },
  });

  if (!targetMembership) {
    return { success: false, error: 'User is not a member of this team' };
  }

  // Prevent removing last admin
  if (targetMembership.role === TeamRole.ADMIN) {
    const adminCount = await TeamMember.count({
      where: { team_id: teamId, role: TeamRole.ADMIN },
    });

    if (adminCount <= 1) {
      return { success: false, error: 'Cannot remove the last admin' };
    }
  }

  // Remove member
  await targetMembership.destroy();

  return { success: true };
};

/**
 * Update member role
 */
export const updateMemberRole = async (
  teamId: string,
  targetUserId: string,
  requestingUserId: string,
  input: UpdateMemberRoleInput
): Promise<ServiceResult<{ member: SafeTeamMember }>> => {
  const { role } = input;

  // Get team
  const team = await Team.findByPk(teamId);
  if (!team) {
    return { success: false, error: 'Team not found' };
  }

  // Check if requesting user is admin
  const requesterMembership = await TeamMember.findOne({
    where: { team_id: teamId, user_id: requestingUserId },
  });

  if (!requesterMembership || requesterMembership.role !== TeamRole.ADMIN) {
    return { success: false, error: 'Only team admins can change member roles' };
  }

  // Get target membership
  const targetMembership = await TeamMember.findOne({
    where: { team_id: teamId, user_id: targetUserId },
  });

  if (!targetMembership) {
    return { success: false, error: 'User is not a member of this team' };
  }

  // Prevent demoting last admin
  if (targetMembership.role === TeamRole.ADMIN && role !== TeamRole.ADMIN) {
    const adminCount = await TeamMember.count({
      where: { team_id: teamId, role: TeamRole.ADMIN },
    });

    if (adminCount <= 1) {
      return { success: false, error: 'Cannot demote the last admin' };
    }
  }

  // Update role
  await targetMembership.update({ role: role as TeamRole });

  return {
    success: true,
    data: {
      member: {
        id: targetMembership.id,
        user_id: targetMembership.user_id,
        role: targetMembership.role,
        joined_at: targetMembership.joined_at,
      },
    },
  };
};

/**
 * Leave team (self-removal)
 */
export const leaveTeam = async (
  teamId: string,
  userId: string
): Promise<ServiceResult> => {
  // Get team
  const team = await Team.findByPk(teamId);
  if (!team) {
    return { success: false, error: 'Team not found' };
  }

  // Cannot leave if owner
  if (team.owner_id === userId) {
    return { success: false, error: 'Team owner cannot leave. Transfer ownership or delete the team.' };
  }

  // Get membership
  const membership = await TeamMember.findOne({
    where: { team_id: teamId, user_id: userId },
  });

  if (!membership) {
    return { success: false, error: 'You are not a member of this team' };
  }

  // Prevent last admin from leaving
  if (membership.role === TeamRole.ADMIN) {
    const adminCount = await TeamMember.count({
      where: { team_id: teamId, role: TeamRole.ADMIN },
    });

    if (adminCount <= 1) {
      return { success: false, error: 'Last admin cannot leave. Promote another member first.' };
    }
  }

  // Remove membership
  await membership.destroy();

  return { success: true };
};

/**
 * Check if user is member of team
 */
export const isTeamMember = async (
  teamId: string,
  userId: string
): Promise<boolean> => {
  const membership = await TeamMember.findOne({
    where: { team_id: teamId, user_id: userId },
  });
  return !!membership;
};

/**
 * Check if user is team admin
 */
export const isTeamAdmin = async (
  teamId: string,
  userId: string
): Promise<boolean> => {
  const membership = await TeamMember.findOne({
    where: { team_id: teamId, user_id: userId, role: TeamRole.ADMIN },
  });
  return !!membership;
};

/**
 * Get user's role in team
 */
export const getUserTeamRole = async (
  teamId: string,
  userId: string
): Promise<TeamRole | null> => {
  const membership = await TeamMember.findOne({
    where: { team_id: teamId, user_id: userId },
  });
  return membership?.role || null;
};
