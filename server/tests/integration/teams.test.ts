/**
 * Integration Tests for Team Endpoints
 * Tests team CRUD operations and member management
 */

import request from 'supertest';
import app from '../../src/index';
import sequelize from '../../src/database/connection';
import { 
  cleanupTestData, 
  assertSuccessResponse, 
  assertErrorResponse,
  createTestUser,
  createTestTeam,
  addTeamMember,
  getAuthHeader,
} from '../utils';
import { TeamRole } from '../../src/models/TeamMember';

describe('Team Endpoints', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // ===========================================
  // Create Team Tests
  // ===========================================

  describe('POST /api/v1/teams', () => {
    it('should create a new team', async () => {
      const user = await createTestUser();
      
      const response = await request(app)
        .post('/api/v1/teams')
        .set(getAuthHeader(user))
        .send({
          name: 'My New Team',
          description: 'A test team',
        })
        .expect(201);

      assertSuccessResponse(response);
      expect(response.body.data.name).toBe('My New Team');
      expect(response.body.data.description).toBe('A test team');
    });

    it('should make creator an admin', async () => {
      const user = await createTestUser();
      
      const response = await request(app)
        .post('/api/v1/teams')
        .set(getAuthHeader(user))
        .send({ name: 'Admin Test Team' })
        .expect(201);

      // Verify user is admin by checking members endpoint
      const membersResponse = await request(app)
        .get(`/api/v1/teams/${response.body.data.id}/members`)
        .set(getAuthHeader(user))
        .expect(200);

      const creator = membersResponse.body.data.find(
        (m: any) => m.user?.id === user.id || m.user_id === user.id
      );
      expect(creator?.role).toBe(TeamRole.ADMIN);
    });

    it('should reject invalid team name', async () => {
      const user = await createTestUser();
      
      await request(app)
        .post('/api/v1/teams')
        .set(getAuthHeader(user))
        .send({ name: '' })
        .expect(400);
    });

    it('should reject unauthenticated request', async () => {
      await request(app)
        .post('/api/v1/teams')
        .send({ name: 'Unauthorized Team' })
        .expect(401);
    });
  });

  // ===========================================
  // Get Teams Tests
  // ===========================================

  describe('GET /api/v1/teams', () => {
    it('should return user teams', async () => {
      const user = await createTestUser();
      const { team } = await createTestTeam(user);

      const response = await request(app)
        .get('/api/v1/teams')
        .set(getAuthHeader(user))
        .expect(200);

      assertSuccessResponse(response);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.some((t: any) => t.id === team.id)).toBe(true);
    });

    it('should return empty array for user with no teams', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .get('/api/v1/teams')
        .set(getAuthHeader(user))
        .expect(200);

      assertSuccessResponse(response);
      expect(response.body.data).toEqual([]);
    });

    it('should not return teams user is not member of', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      
      await createTestTeam(user1, { name: 'Team 1' });

      const response = await request(app)
        .get('/api/v1/teams')
        .set(getAuthHeader(user2))
        .expect(200);

      expect(response.body.data).toEqual([]);
    });
  });

  // ===========================================
  // Get Single Team Tests
  // ===========================================

  describe('GET /api/v1/teams/:teamId', () => {
    it('should return team details for member', async () => {
      const user = await createTestUser();
      const { team } = await createTestTeam(user);

      const response = await request(app)
        .get(`/api/v1/teams/${team.id}`)
        .set(getAuthHeader(user))
        .expect(200);

      assertSuccessResponse(response);
      expect(response.body.data.id).toBe(team.id);
      expect(response.body.data.name).toBe(team.name);
    });

    it('should reject non-member access', async () => {
      const owner = await createTestUser();
      const outsider = await createTestUser();
      const { team } = await createTestTeam(owner);

      await request(app)
        .get(`/api/v1/teams/${team.id}`)
        .set(getAuthHeader(outsider))
        .expect(403);
    });

    it('should return 404 for non-existent team', async () => {
      const user = await createTestUser();

      await request(app)
        .get('/api/v1/teams/00000000-0000-0000-0000-000000000000')
        .set(getAuthHeader(user))
        .expect(404);
    });
  });

  // ===========================================
  // Update Team Tests
  // ===========================================

  describe('PATCH /api/v1/teams/:teamId', () => {
    it('should allow admin to update team', async () => {
      const user = await createTestUser();
      const { team } = await createTestTeam(user);

      const response = await request(app)
        .patch(`/api/v1/teams/${team.id}`)
        .set(getAuthHeader(user))
        .send({ name: 'Updated Team Name' })
        .expect(200);

      assertSuccessResponse(response);
      expect(response.body.data.name).toBe('Updated Team Name');
    });

    it('should reject viewer update', async () => {
      const owner = await createTestUser();
      const viewer = await createTestUser();
      const { team } = await createTestTeam(owner);
      await addTeamMember(team, viewer, TeamRole.VIEWER);

      await request(app)
        .patch(`/api/v1/teams/${team.id}`)
        .set(getAuthHeader(viewer))
        .send({ name: 'Hacked Name' })
        .expect(403);
    });

    it('should reject editor update', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const { team } = await createTestTeam(owner);
      await addTeamMember(team, editor, TeamRole.EDITOR);

      await request(app)
        .patch(`/api/v1/teams/${team.id}`)
        .set(getAuthHeader(editor))
        .send({ name: 'Editor Name' })
        .expect(403);
    });
  });

  // ===========================================
  // Delete Team Tests
  // ===========================================

  describe('DELETE /api/v1/teams/:teamId', () => {
    it('should allow owner to delete team', async () => {
      const owner = await createTestUser();
      const { team } = await createTestTeam(owner);

      await request(app)
        .delete(`/api/v1/teams/${team.id}`)
        .set(getAuthHeader(owner))
        .expect(200);

      // Verify team is deleted
      await request(app)
        .get(`/api/v1/teams/${team.id}`)
        .set(getAuthHeader(owner))
        .expect(404);
    });

    it('should reject non-owner delete', async () => {
      const owner = await createTestUser();
      const admin = await createTestUser();
      const { team } = await createTestTeam(owner);
      await addTeamMember(team, admin, TeamRole.ADMIN);

      // Even admins cannot delete (only owner can)
      await request(app)
        .delete(`/api/v1/teams/${team.id}`)
        .set(getAuthHeader(admin))
        .expect(403);
    });
  });

  // ===========================================
  // Team Members Tests
  // ===========================================

  describe('GET /api/v1/teams/:teamId/members', () => {
    it('should return team members', async () => {
      const owner = await createTestUser();
      const member = await createTestUser();
      const { team } = await createTestTeam(owner);
      await addTeamMember(team, member, TeamRole.VIEWER);

      const response = await request(app)
        .get(`/api/v1/teams/${team.id}/members`)
        .set(getAuthHeader(owner))
        .expect(200);

      assertSuccessResponse(response);
      expect(response.body.data.length).toBe(2);
    });

    it('should include role information', async () => {
      const owner = await createTestUser();
      const { team } = await createTestTeam(owner);

      const response = await request(app)
        .get(`/api/v1/teams/${team.id}/members`)
        .set(getAuthHeader(owner))
        .expect(200);

      const ownerMember = response.body.data.find(
        (m: any) => m.user?.id === owner.id || m.user_id === owner.id
      );
      expect(ownerMember.role).toBe(TeamRole.ADMIN);
    });
  });

  describe('PATCH /api/v1/teams/:teamId/members/:userId/role', () => {
    it('should allow admin to change member role', async () => {
      const owner = await createTestUser();
      const member = await createTestUser();
      const { team } = await createTestTeam(owner);
      await addTeamMember(team, member, TeamRole.VIEWER);

      const response = await request(app)
        .patch(`/api/v1/teams/${team.id}/members/${member.id}/role`)
        .set(getAuthHeader(owner))
        .send({ role: TeamRole.EDITOR })
        .expect(200);

      assertSuccessResponse(response);
      expect(response.body.data.role).toBe(TeamRole.EDITOR);
    });

    it('should reject viewer changing roles', async () => {
      const owner = await createTestUser();
      const viewer = await createTestUser();
      const target = await createTestUser();
      const { team } = await createTestTeam(owner);
      await addTeamMember(team, viewer, TeamRole.VIEWER);
      await addTeamMember(team, target, TeamRole.VIEWER);

      await request(app)
        .patch(`/api/v1/teams/${team.id}/members/${target.id}/role`)
        .set(getAuthHeader(viewer))
        .send({ role: TeamRole.ADMIN })
        .expect(403);
    });

    it('should prevent removing last admin', async () => {
      const owner = await createTestUser();
      const { team } = await createTestTeam(owner);

      const response = await request(app)
        .patch(`/api/v1/teams/${team.id}/members/${owner.id}/role`)
        .set(getAuthHeader(owner))
        .send({ role: TeamRole.VIEWER })
        .expect(400);

      assertErrorResponse(response);
    });
  });

  describe('DELETE /api/v1/teams/:teamId/members/:userId', () => {
    it('should allow admin to remove member', async () => {
      const owner = await createTestUser();
      const member = await createTestUser();
      const { team } = await createTestTeam(owner);
      await addTeamMember(team, member, TeamRole.VIEWER);

      await request(app)
        .delete(`/api/v1/teams/${team.id}/members/${member.id}`)
        .set(getAuthHeader(owner))
        .expect(200);

      // Verify member is removed
      const response = await request(app)
        .get(`/api/v1/teams/${team.id}/members`)
        .set(getAuthHeader(owner))
        .expect(200);

      expect(response.body.data.length).toBe(1);
    });

    it('should reject viewer removing members', async () => {
      const owner = await createTestUser();
      const viewer = await createTestUser();
      const target = await createTestUser();
      const { team } = await createTestTeam(owner);
      await addTeamMember(team, viewer, TeamRole.VIEWER);
      await addTeamMember(team, target, TeamRole.VIEWER);

      await request(app)
        .delete(`/api/v1/teams/${team.id}/members/${target.id}`)
        .set(getAuthHeader(viewer))
        .expect(403);
    });

    it('should prevent owner from being removed', async () => {
      const owner = await createTestUser();
      const admin = await createTestUser();
      const { team } = await createTestTeam(owner);
      await addTeamMember(team, admin, TeamRole.ADMIN);

      await request(app)
        .delete(`/api/v1/teams/${team.id}/members/${owner.id}`)
        .set(getAuthHeader(admin))
        .expect(400);
    });
  });

  // ===========================================
  // Leave Team Tests
  // ===========================================

  describe('POST /api/v1/teams/:teamId/leave', () => {
    it('should allow member to leave team', async () => {
      const owner = await createTestUser();
      const member = await createTestUser();
      const { team } = await createTestTeam(owner);
      await addTeamMember(team, member, TeamRole.VIEWER);

      await request(app)
        .post(`/api/v1/teams/${team.id}/leave`)
        .set(getAuthHeader(member))
        .expect(200);

      // Verify member left
      const response = await request(app)
        .get(`/api/v1/teams/${team.id}/members`)
        .set(getAuthHeader(owner))
        .expect(200);

      expect(response.body.data.length).toBe(1);
    });

    it('should prevent owner from leaving', async () => {
      const owner = await createTestUser();
      const { team } = await createTestTeam(owner);

      await request(app)
        .post(`/api/v1/teams/${team.id}/leave`)
        .set(getAuthHeader(owner))
        .expect(400);
    });
  });
});
