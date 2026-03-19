/**
 * Test Utilities
 * Helper functions and factories for testing
 */

import { User, Team, TeamMember, Project, Invitation } from '../src/models';
import { TeamRole } from '../src/models/TeamMember';
import { InvitationStatus } from '../src/models/Invitation';
import { generateTokenPair } from '../src/utils/jwt';
import { hashPassword } from '../src/utils/password';
import { v4 as uuidv4 } from 'uuid';

// ===========================================
// Test Data Factories
// ===========================================

export interface TestUserData {
  email?: string;
  password?: string;
  name?: string;
  email_verified?: boolean;
}

export interface TestTeamData {
  name?: string;
  description?: string;
}

export interface TestProjectData {
  name?: string;
  description?: string;
}

/**
 * Create a test user
 */
export async function createTestUser(data: TestUserData = {}): Promise<User> {
  const uniqueId = uuidv4().slice(0, 8);
  const password = data.password || 'TestPassword123!';
  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    email: data.email || `test-${uniqueId}@example.com`,
    password_hash: hashedPassword,
    name: data.name || `Test User ${uniqueId}`,
    email_verified: data.email_verified ?? true,
  });

  // Attach plain password for test usage
  (user as any).plainPassword = password;

  return user;
}

/**
 * Create a test team with owner
 */
export async function createTestTeam(
  owner: User,
  data: TestTeamData = {}
): Promise<{ team: Team; membership: TeamMember }> {
  const uniqueId = uuidv4().slice(0, 8);

  const team = await Team.create({
    name: data.name || `Test Team ${uniqueId}`,
    description: data.description || 'A test team',
    owner_id: owner.id,
  });

  const membership = await TeamMember.create({
    team_id: team.id,
    user_id: owner.id,
    role: TeamRole.ADMIN,
    joined_at: new Date(),
  });

  return { team, membership };
}

/**
 * Add a member to a team
 */
export async function addTeamMember(
  team: Team,
  user: User,
  role: TeamRole = TeamRole.VIEWER
): Promise<TeamMember> {
  return TeamMember.create({
    team_id: team.id,
    user_id: user.id,
    role,
    joined_at: new Date(),
  });
}

/**
 * Create a test project
 */
export async function createTestProject(
  team: Team,
  creator?: User,
  data: TestProjectData = {}
): Promise<Project> {
  const uniqueId = uuidv4().slice(0, 8);

  return Project.create({
    team_id: team.id,
    name: data.name || `Test Project ${uniqueId}`,
    description: data.description || 'A test project',
    created_by: creator?.id || team.owner_id,
  });
}

/**
 * Create a test invitation
 */
export async function createTestInvitation(
  team: Team,
  inviter: User,
  email: string,
  role: TeamRole = TeamRole.VIEWER
): Promise<{ invitation: Invitation; token: string }> {
  const { generateSecureToken, hashToken } = await import('../src/utils/crypto');
  
  const token = generateSecureToken(32);
  const tokenHash = hashToken(token);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await Invitation.create({
    team_id: team.id,
    email: email.toLowerCase(),
    role,
    token_hash: tokenHash,
    invited_by: inviter.id,
    expires_at: expiresAt,
  });

  return { invitation, token };
}

// ===========================================
// Authentication Helpers
// ===========================================

/**
 * Generate auth tokens for a test user
 */
export function getAuthTokens(user: User): { accessToken: string; refreshToken: string } {
  const tokens = generateTokenPair(user.id, user.email);
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
}

/**
 * Get authorization header for a user
 */
export function getAuthHeader(user: User): { Authorization: string } {
  const { accessToken } = getAuthTokens(user);
  return { Authorization: `Bearer ${accessToken}` };
}

// ===========================================
// Cleanup Helpers
// ===========================================

/**
 * Clean up all test data from database
 */
export async function cleanupTestData(): Promise<void> {
  // Order matters due to foreign keys
  await Invitation.destroy({ where: {}, force: true });
  await TeamMember.destroy({ where: {}, force: true });
  await Project.destroy({ where: {}, force: true });
  await Team.destroy({ where: {}, force: true });
  await User.destroy({ where: {}, force: true });
}

/**
 * Clean up specific test user and related data
 */
export async function cleanupUser(user: User): Promise<void> {
  // Remove team memberships
  await TeamMember.destroy({ where: { user_id: user.id }, force: true });
  
  // Remove invitations sent by user
  await Invitation.destroy({ where: { invited_by: user.id }, force: true });
  
  // Find teams owned by user
  const teams = await Team.findAll({ where: { owner_id: user.id } });
  
  for (const team of teams) {
    await Invitation.destroy({ where: { team_id: team.id }, force: true });
    await TeamMember.destroy({ where: { team_id: team.id }, force: true });
    await Project.destroy({ where: { team_id: team.id }, force: true });
    await team.destroy({ force: true });
  }
  
  await user.destroy({ force: true });
}

// ===========================================
// Assertion Helpers
// ===========================================

/**
 * Assert API response has success format
 */
export function assertSuccessResponse(response: any): void {
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('data');
}

/**
 * Assert API response has error format
 */
export function assertErrorResponse(response: any, message?: string): void {
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('error');
  if (message) {
    expect(response.body.error).toBe(message);
  }
}

// ===========================================
// Mock Helpers
// ===========================================

/**
 * Mock email service to prevent actual email sending
 */
export function mockEmailService(): jest.SpyInstance {
  const { emailService } = require('../src/services/EmailService');
  
  jest.spyOn(emailService, 'sendTeamInvitation').mockResolvedValue({ success: true });
  jest.spyOn(emailService, 'sendInvitationAccepted').mockResolvedValue({ success: true });
  jest.spyOn(emailService, 'sendWelcomeToTeam').mockResolvedValue({ success: true });
  jest.spyOn(emailService, 'sendEmailVerification').mockResolvedValue({ success: true });
  jest.spyOn(emailService, 'sendPasswordReset').mockResolvedValue({ success: true });
  
  return jest.spyOn(emailService, 'send').mockResolvedValue({ success: true });
}

/**
 * Create expired date for testing
 */
export function getExpiredDate(daysAgo: number = 1): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * Create future date for testing
 */
export function getFutureDate(daysAhead: number = 7): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date;
}
