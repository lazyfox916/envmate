/**
 * Invitation Service
 * Handles team invitation business logic with secure token handling
 */

import crypto from 'crypto';
import { Op } from 'sequelize';
import { Invitation, InvitationStatus, Team, TeamMember, User } from '../models';
import { TeamRole } from '../models/TeamMember';
import { generateSecureToken, hashToken } from '../utils/crypto';
import { emailService, generateEmailUrls, formatExpiryTime } from './EmailService';
import { AuditService } from './AuditService';
import { AuditAction, AuditEntityType } from '../models/AuditLog';
import { getRoleDisplayName } from '../constants/permissions';
import { Request } from 'express';

// ===========================================
// Configuration
// ===========================================

const INVITATION_EXPIRY_DAYS = 7;
const MAX_PENDING_INVITATIONS_PER_TEAM = 50;
const TOKEN_LENGTH = 32; // 256 bits

// ===========================================
// Types
// ===========================================

export interface CreateInvitationInput {
  teamId: string;
  email: string;
  role?: TeamRole;
  invitedBy: string;
}

export interface InvitationResult {
  success: boolean;
  data?: Invitation;
  error?: string;
}

export interface AcceptInvitationResult {
  success: boolean;
  data?: {
    team: Team;
    membership: TeamMember;
  };
  error?: string;
}

// ===========================================
// Invitation Service Class
// ===========================================

export class InvitationService {
  /**
   * Create and send a team invitation
   */
  static async createInvitation(
    input: CreateInvitationInput,
    req?: Request
  ): Promise<InvitationResult> {
    const { teamId, email, role = TeamRole.VIEWER, invitedBy } = input;

    try {
      // Validate team exists
      const team = await Team.findByPk(teamId);
      if (!team) {
        return { success: false, error: 'Team not found' };
      }

      // Get inviter details
      const inviter = await User.findByPk(invitedBy);
      if (!inviter) {
        return { success: false, error: 'Inviter not found' };
      }

      // Check inviter is admin of team
      const inviterMembership = await TeamMember.findOne({
        where: { team_id: teamId, user_id: invitedBy },
      });
      if (!inviterMembership || inviterMembership.role !== TeamRole.ADMIN) {
        return { success: false, error: 'Only team admins can send invitations' };
      }

      // Check if email is already a team member
      const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
      if (existingUser) {
        const existingMembership = await TeamMember.findOne({
          where: { team_id: teamId, user_id: existingUser.id },
        });
        if (existingMembership) {
          return { success: false, error: 'User is already a member of this team' };
        }
      }

      // Check for existing pending invitation
      const existingInvitation = await Invitation.findOne({
        where: {
          team_id: teamId,
          email: email.toLowerCase(),
          status: InvitationStatus.PENDING,
        },
      });
      if (existingInvitation) {
        // If expired, mark it and allow new one
        if (existingInvitation.isExpired()) {
          await existingInvitation.update({ status: InvitationStatus.EXPIRED });
        } else {
          return { success: false, error: 'An invitation is already pending for this email' };
        }
      }

      // Check pending invitation limit
      const pendingCount = await Invitation.count({
        where: {
          team_id: teamId,
          status: InvitationStatus.PENDING,
        },
      });
      if (pendingCount >= MAX_PENDING_INVITATIONS_PER_TEAM) {
        return { success: false, error: 'Team has reached maximum pending invitations limit' };
      }

      // Generate secure token
      const token = generateSecureToken(TOKEN_LENGTH);
      const tokenHash = hashToken(token);

      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

      // Create invitation
      const invitation = await Invitation.create({
        team_id: teamId,
        email: email.toLowerCase(),
        role,
        token_hash: tokenHash,
        invited_by: invitedBy,
        expires_at: expiresAt,
      });

      // Send invitation email
      const emailResult = await emailService.sendTeamInvitation(email, {
        inviteeName: existingUser?.name,
        inviterName: inviter.name,
        inviterEmail: inviter.email,
        teamName: team.name,
        role: getRoleDisplayName(role),
        acceptUrl: generateEmailUrls.invitationAccept(token),
        rejectUrl: generateEmailUrls.invitationReject(token),
        expiresIn: formatExpiryTime(expiresAt),
      });

      if (!emailResult.success) {
        // Log email failure but don't fail the invitation
        console.error('Failed to send invitation email:', emailResult.error);
      }

      // Audit log
      if (req) {
        await AuditService.logFromRequest(req, {
          action: AuditAction.INVITATION_SENT,
          entityType: AuditEntityType.INVITATION,
          entityId: invitation.id,
          description: `Invitation sent to ${email} for team ${team.name}`,
          metadata: {
            teamId,
            teamName: team.name,
            inviteeEmail: email,
            role,
            expiresAt: expiresAt.toISOString(),
          },
        });
      }

      return { success: true, data: invitation };
    } catch (error) {
      console.error('Create invitation error:', error);
      return { success: false, error: 'Failed to create invitation' };
    }
  }

  /**
   * Accept an invitation using token
   */
  static async acceptInvitation(
    token: string,
    userId: string,
    req?: Request
  ): Promise<AcceptInvitationResult> {
    try {
      // Hash the provided token
      const tokenHash = hashToken(token);

      // Find the invitation
      const invitation = await Invitation.findOne({
        where: { token_hash: tokenHash },
        include: [
          { model: Team, as: 'team' },
        ],
      });

      if (!invitation) {
        return { success: false, error: 'Invalid invitation token' };
      }

      // Check if invitation is valid
      if (invitation.status !== InvitationStatus.PENDING) {
        return { success: false, error: `Invitation has already been ${invitation.status}` };
      }

      if (invitation.isExpired()) {
        await invitation.update({ status: InvitationStatus.EXPIRED });
        return { success: false, error: 'Invitation has expired' };
      }

      // Get accepting user
      const user = await User.findByPk(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify email matches (case insensitive)
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        return { 
          success: false, 
          error: 'This invitation was sent to a different email address' 
        };
      }

      // Check if already a member
      const existingMembership = await TeamMember.findOne({
        where: { team_id: invitation.team_id, user_id: userId },
      });
      if (existingMembership) {
        // Already a member, just mark invitation as accepted
        await invitation.update({ 
          status: InvitationStatus.ACCEPTED,
          accepted_at: new Date(),
        });
        return { success: false, error: 'You are already a member of this team' };
      }

      // Create team membership
      const membership = await TeamMember.create({
        team_id: invitation.team_id,
        user_id: userId,
        role: invitation.role,
        joined_at: new Date(),
      });

      // Update invitation status
      await invitation.update({
        status: InvitationStatus.ACCEPTED,
        accepted_at: new Date(),
      });

      // Get team for response
      const team = await Team.findByPk(invitation.team_id);
      if (!team) {
        return { success: false, error: 'Team not found' };
      }

      // Send notification to inviter
      const inviter = await User.findByPk(invitation.invited_by);
      if (inviter) {
        await emailService.sendInvitationAccepted(inviter.email, {
          inviterName: inviter.name,
          newMemberName: user.name,
          newMemberEmail: user.email,
          teamName: team.name,
          role: getRoleDisplayName(invitation.role),
          teamUrl: generateEmailUrls.team(team.id),
        });
      }

      // Send welcome email to new member
      await emailService.sendWelcomeToTeam(user.email, {
        memberName: user.name,
        teamName: team.name,
        role: getRoleDisplayName(invitation.role),
        teamUrl: generateEmailUrls.team(team.id),
      });

      // Audit log
      if (req) {
        await AuditService.logFromRequest(req, {
          action: AuditAction.INVITATION_ACCEPTED,
          entityType: AuditEntityType.INVITATION,
          entityId: invitation.id,
          description: `${user.name} accepted invitation to team ${team.name}`,
          metadata: {
            teamId: team.id,
            teamName: team.name,
            role: invitation.role,
          },
        });

        await AuditService.logFromRequest(req, {
          action: AuditAction.MEMBER_ADDED,
          entityType: AuditEntityType.TEAM_MEMBER,
          entityId: membership.id,
          description: `${user.name} joined team ${team.name} as ${invitation.role}`,
          metadata: {
            teamId: team.id,
            role: invitation.role,
            invitedBy: invitation.invited_by,
          },
        });
      }

      return { success: true, data: { team, membership } };
    } catch (error) {
      console.error('Accept invitation error:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }
  }

  /**
   * Reject an invitation using token
   */
  static async rejectInvitation(
    token: string,
    userId?: string,
    req?: Request
  ): Promise<InvitationResult> {
    try {
      const tokenHash = hashToken(token);

      const invitation = await Invitation.findOne({
        where: { token_hash: tokenHash },
        include: [{ model: Team, as: 'team' }],
      });

      if (!invitation) {
        return { success: false, error: 'Invalid invitation token' };
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        return { success: false, error: `Invitation has already been ${invitation.status}` };
      }

      // Update status
      await invitation.update({ status: InvitationStatus.REJECTED });

      // Audit log
      if (req) {
        await AuditService.logFromRequest(req, {
          action: AuditAction.INVITATION_REJECTED,
          entityType: AuditEntityType.INVITATION,
          entityId: invitation.id,
          description: `Invitation to team rejected`,
          metadata: {
            teamId: invitation.team_id,
            inviteeEmail: invitation.email,
          },
        });
      }

      return { success: true, data: invitation };
    } catch (error) {
      console.error('Reject invitation error:', error);
      return { success: false, error: 'Failed to reject invitation' };
    }
  }

  /**
   * Revoke an invitation (admin action)
   */
  static async revokeInvitation(
    invitationId: string,
    adminUserId: string,
    req?: Request
  ): Promise<InvitationResult> {
    try {
      const invitation = await Invitation.findByPk(invitationId, {
        include: [{ model: Team, as: 'team' }],
      });

      if (!invitation) {
        return { success: false, error: 'Invitation not found' };
      }

      // Verify admin permission
      const adminMembership = await TeamMember.findOne({
        where: { team_id: invitation.team_id, user_id: adminUserId },
      });
      if (!adminMembership || adminMembership.role !== TeamRole.ADMIN) {
        return { success: false, error: 'Only team admins can revoke invitations' };
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        return { success: false, error: 'Only pending invitations can be revoked' };
      }

      // Update status
      await invitation.update({ status: InvitationStatus.REVOKED });

      // Audit log
      if (req) {
        await AuditService.logFromRequest(req, {
          action: AuditAction.INVITATION_REVOKED,
          entityType: AuditEntityType.INVITATION,
          entityId: invitation.id,
          description: `Invitation to ${invitation.email} was revoked`,
          metadata: {
            teamId: invitation.team_id,
            inviteeEmail: invitation.email,
            revokedBy: adminUserId,
          },
        });
      }

      return { success: true, data: invitation };
    } catch (error) {
      console.error('Revoke invitation error:', error);
      return { success: false, error: 'Failed to revoke invitation' };
    }
  }

  /**
   * Get pending invitations for a team
   */
  static async getTeamInvitations(
    teamId: string,
    userId: string
  ): Promise<{ success: boolean; data?: Invitation[]; error?: string }> {
    try {
      // Verify user has access
      const membership = await TeamMember.findOne({
        where: { team_id: teamId, user_id: userId },
      });
      if (!membership || membership.role !== TeamRole.ADMIN) {
        return { success: false, error: 'Only team admins can view invitations' };
      }

      const invitations = await Invitation.findAll({
        where: {
          team_id: teamId,
          status: InvitationStatus.PENDING,
        },
        include: [
          { model: User, as: 'inviter', attributes: ['id', 'name', 'email'] },
        ],
        order: [['created_at', 'DESC']],
      });

      // Mark expired ones
      for (const invitation of invitations) {
        if (invitation.isExpired()) {
          await invitation.update({ status: InvitationStatus.EXPIRED });
        }
      }

      // Return only still-pending ones
      const pendingInvitations = invitations.filter(
        inv => inv.status === InvitationStatus.PENDING
      );

      return { success: true, data: pendingInvitations };
    } catch (error) {
      console.error('Get team invitations error:', error);
      return { success: false, error: 'Failed to get invitations' };
    }
  }

  /**
   * Get pending invitations for a user (by email)
   */
  static async getUserInvitations(
    email: string
  ): Promise<{ success: boolean; data?: Invitation[]; error?: string }> {
    try {
      const invitations = await Invitation.findAll({
        where: {
          email: email.toLowerCase(),
          status: InvitationStatus.PENDING,
          expires_at: {
            [Op.gt]: new Date(),
          },
        },
        include: [
          { model: Team, as: 'team', attributes: ['id', 'name', 'description'] },
          { model: User, as: 'inviter', attributes: ['id', 'name', 'email'] },
        ],
        order: [['created_at', 'DESC']],
      });

      return { success: true, data: invitations };
    } catch (error) {
      console.error('Get user invitations error:', error);
      return { success: false, error: 'Failed to get invitations' };
    }
  }

  /**
   * Validate invitation token and return invitation details (without accepting)
   */
  static async validateToken(
    token: string
  ): Promise<{ 
    success: boolean; 
    data?: { invitation: Invitation; team: Team; inviter: User }; 
    error?: string 
  }> {
    try {
      const tokenHash = hashToken(token);

      const invitation = await Invitation.findOne({
        where: { token_hash: tokenHash },
        include: [
          { model: Team, as: 'team' },
          { model: User, as: 'inviter', attributes: ['id', 'name', 'email'] },
        ],
      });

      if (!invitation) {
        return { success: false, error: 'Invalid invitation token' };
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        return { success: false, error: `Invitation has already been ${invitation.status}` };
      }

      if (invitation.isExpired()) {
        return { success: false, error: 'Invitation has expired' };
      }

      const team = await Team.findByPk(invitation.team_id);
      const inviter = await User.findByPk(invitation.invited_by);

      if (!team || !inviter) {
        return { success: false, error: 'Team or inviter not found' };
      }

      return { success: true, data: { invitation, team, inviter } };
    } catch (error) {
      console.error('Validate token error:', error);
      return { success: false, error: 'Failed to validate token' };
    }
  }

  /**
   * Resend invitation email
   */
  static async resendInvitation(
    invitationId: string,
    adminUserId: string,
    req?: Request
  ): Promise<InvitationResult> {
    try {
      const invitation = await Invitation.findByPk(invitationId, {
        include: [
          { model: Team, as: 'team' },
          { model: User, as: 'inviter' },
        ],
      });

      if (!invitation) {
        return { success: false, error: 'Invitation not found' };
      }

      // Verify admin permission
      const adminMembership = await TeamMember.findOne({
        where: { team_id: invitation.team_id, user_id: adminUserId },
      });
      if (!adminMembership || adminMembership.role !== TeamRole.ADMIN) {
        return { success: false, error: 'Only team admins can resend invitations' };
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        return { success: false, error: 'Only pending invitations can be resent' };
      }

      // Generate new token and extend expiry
      const newToken = generateSecureToken(TOKEN_LENGTH);
      const newTokenHash = hashToken(newToken);
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + INVITATION_EXPIRY_DAYS);

      await invitation.update({
        token_hash: newTokenHash,
        expires_at: newExpiresAt,
      });

      // Get team and inviter for email
      const team = await Team.findByPk(invitation.team_id);
      const inviter = await User.findByPk(invitation.invited_by);

      if (!team || !inviter) {
        return { success: false, error: 'Team or inviter not found' };
      }

      // Check if invitee has an account
      const existingUser = await User.findOne({ 
        where: { email: invitation.email.toLowerCase() } 
      });

      // Send email
      await emailService.sendTeamInvitation(invitation.email, {
        inviteeName: existingUser?.name,
        inviterName: inviter.name,
        inviterEmail: inviter.email,
        teamName: team.name,
        role: getRoleDisplayName(invitation.role),
        acceptUrl: generateEmailUrls.invitationAccept(newToken),
        rejectUrl: generateEmailUrls.invitationReject(newToken),
        expiresIn: formatExpiryTime(newExpiresAt),
      });

      // Audit log
      if (req) {
        await AuditService.logFromRequest(req, {
          action: AuditAction.INVITATION_SENT,
          entityType: AuditEntityType.INVITATION,
          entityId: invitation.id,
          description: `Invitation resent to ${invitation.email}`,
          metadata: {
            teamId: team.id,
            inviteeEmail: invitation.email,
            resent: true,
          },
        });
      }

      return { success: true, data: invitation };
    } catch (error) {
      console.error('Resend invitation error:', error);
      return { success: false, error: 'Failed to resend invitation' };
    }
  }

  /**
   * Cleanup expired invitations (batch job)
   */
  static async cleanupExpiredInvitations(): Promise<number> {
    try {
      const [affectedCount] = await Invitation.update(
        { status: InvitationStatus.EXPIRED },
        {
          where: {
            status: InvitationStatus.PENDING,
            expires_at: {
              [Op.lt]: new Date(),
            },
          },
        }
      );

      if (affectedCount > 0) {
        console.log(`Marked ${affectedCount} invitations as expired`);
      }

      return affectedCount;
    } catch (error) {
      console.error('Cleanup expired invitations error:', error);
      return 0;
    }
  }
}

export default InvitationService;
