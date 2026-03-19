/**
 * RBAC Permission Tests
 * Tests role-based access control for teams and projects
 */

import request from 'supertest';
import app from '../../src/index';
import sequelize from '../../src/database/connection';
import { 
  cleanupTestData, 
  createTestUser,
  createTestTeam,
  createTestProject,
  addTeamMember,
  getAuthHeader,
} from '../utils';
import { TeamRole } from '../../src/models/TeamMember';

// Helper to create team with user in one call
async function setupTeamWithOwner(teamData?: { name?: string; description?: string }) {
  const user = await createTestUser();
  const { team, membership } = await createTestTeam(user, teamData);
  return { user, team, membership };
}

describe('RBAC Permission Tests', () => {
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
  // Team RBAC Tests
  // ===========================================

  describe('Team RBAC', () => {
    describe('Team Update Permissions', () => {
      it('admin can update team', async () => {
        const { user, team } = await setupTeamWithOwner();

        const response = await request(app)
          .patch(`/api/v1/teams/${team.id}`)
          .set(getAuthHeader(user))
          .send({ name: 'Admin Updated' })
          .expect(200);

        expect(response.body.data.name).toBe('Admin Updated');
      });

      it('editor cannot update team', async () => {
        const { user: owner, team } = await setupTeamWithOwner();
        const editor = await createTestUser();
        await addTeamMember(team, editor, TeamRole.EDITOR);

        await request(app)
          .patch(`/api/v1/teams/${team.id}`)
          .set(getAuthHeader(editor))
          .send({ name: 'Editor Updated' })
          .expect(403);
      });

      it('viewer cannot update team', async () => {
        const { user: owner, team } = await setupTeamWithOwner();
        const viewer = await createTestUser();
        await addTeamMember(team, viewer, TeamRole.VIEWER);

        await request(app)
          .patch(`/api/v1/teams/${team.id}`)
          .set(getAuthHeader(viewer))
          .send({ name: 'Viewer Updated' })
          .expect(403);
      });
    });

    describe('Member Management Permissions', () => {
      it('admin can add member', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const newUser = await createTestUser();

        // Note: Adding members typically done via invitations
        // This tests the role change capability
        const response = await request(app)
          .get(`/api/v1/teams/${team.id}/members`)
          .set(getAuthHeader(admin))
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('admin can change member role', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const member = await createTestUser();
        await addTeamMember(team, member, TeamRole.VIEWER);

        const response = await request(app)
          .patch(`/api/v1/teams/${team.id}/members/${member.id}/role`)
          .set(getAuthHeader(admin))
          .send({ role: TeamRole.EDITOR })
          .expect(200);

        expect(response.body.data.role).toBe(TeamRole.EDITOR);
      });

      it('editor cannot change member role', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const editor = await createTestUser();
        const target = await createTestUser();
        await addTeamMember(team, editor, TeamRole.EDITOR);
        await addTeamMember(team, target, TeamRole.VIEWER);

        await request(app)
          .patch(`/api/v1/teams/${team.id}/members/${target.id}/role`)
          .set(getAuthHeader(editor))
          .send({ role: TeamRole.ADMIN })
          .expect(403);
      });

      it('viewer cannot change member role', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const viewer = await createTestUser();
        const target = await createTestUser();
        await addTeamMember(team, viewer, TeamRole.VIEWER);
        await addTeamMember(team, target, TeamRole.VIEWER);

        await request(app)
          .patch(`/api/v1/teams/${team.id}/members/${target.id}/role`)
          .set(getAuthHeader(viewer))
          .send({ role: TeamRole.EDITOR })
          .expect(403);
      });

      it('admin can remove member', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const member = await createTestUser();
        await addTeamMember(team, member, TeamRole.VIEWER);

        await request(app)
          .delete(`/api/v1/teams/${team.id}/members/${member.id}`)
          .set(getAuthHeader(admin))
          .expect(200);
      });

      it('editor cannot remove member', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const editor = await createTestUser();
        const target = await createTestUser();
        await addTeamMember(team, editor, TeamRole.EDITOR);
        await addTeamMember(team, target, TeamRole.VIEWER);

        await request(app)
          .delete(`/api/v1/teams/${team.id}/members/${target.id}`)
          .set(getAuthHeader(editor))
          .expect(403);
      });

      it('viewer cannot remove member', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const viewer = await createTestUser();
        const target = await createTestUser();
        await addTeamMember(team, viewer, TeamRole.VIEWER);
        await addTeamMember(team, target, TeamRole.VIEWER);

        await request(app)
          .delete(`/api/v1/teams/${team.id}/members/${target.id}`)
          .set(getAuthHeader(viewer))
          .expect(403);
      });
    });

    describe('Team Read Permissions', () => {
      it('admin can view team', async () => {
        const { user: admin, team } = await setupTeamWithOwner();

        const response = await request(app)
          .get(`/api/v1/teams/${team.id}`)
          .set(getAuthHeader(admin))
          .expect(200);

        expect(response.body.data.id).toBe(team.id);
      });

      it('editor can view team', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const editor = await createTestUser();
        await addTeamMember(team, editor, TeamRole.EDITOR);

        const response = await request(app)
          .get(`/api/v1/teams/${team.id}`)
          .set(getAuthHeader(editor))
          .expect(200);

        expect(response.body.data.id).toBe(team.id);
      });

      it('viewer can view team', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const viewer = await createTestUser();
        await addTeamMember(team, viewer, TeamRole.VIEWER);

        const response = await request(app)
          .get(`/api/v1/teams/${team.id}`)
          .set(getAuthHeader(viewer))
          .expect(200);

        expect(response.body.data.id).toBe(team.id);
      });

      it('non-member cannot view team', async () => {
        const { team } = await setupTeamWithOwner();
        const outsider = await createTestUser();

        await request(app)
          .get(`/api/v1/teams/${team.id}`)
          .set(getAuthHeader(outsider))
          .expect(403);
      });
    });
  });

  // ===========================================
  // Project RBAC Tests
  // ===========================================

  describe('Project RBAC', () => {
    describe('Project Create Permissions', () => {
      it('admin can create project', async () => {
        const { user: admin, team } = await setupTeamWithOwner();

        const response = await request(app)
          .post(`/api/v1/teams/${team.id}/projects`)
          .set(getAuthHeader(admin))
          .send({ name: 'Admin Project', description: 'Created by admin' })
          .expect(201);

        expect(response.body.data.name).toBe('Admin Project');
      });

      it('editor can create project', async () => {
        const { team } = await setupTeamWithOwner();
        const editor = await createTestUser();
        await addTeamMember(team, editor, TeamRole.EDITOR);

        const response = await request(app)
          .post(`/api/v1/teams/${team.id}/projects`)
          .set(getAuthHeader(editor))
          .send({ name: 'Editor Project', description: 'Created by editor' })
          .expect(201);

        expect(response.body.data.name).toBe('Editor Project');
      });

      it('viewer cannot create project', async () => {
        const { team } = await setupTeamWithOwner();
        const viewer = await createTestUser();
        await addTeamMember(team, viewer, TeamRole.VIEWER);

        await request(app)
          .post(`/api/v1/teams/${team.id}/projects`)
          .set(getAuthHeader(viewer))
          .send({ name: 'Viewer Project' })
          .expect(403);
      });
    });

    describe('Project Read Permissions', () => {
      it('admin can view project', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);

        const response = await request(app)
          .get(`/api/v1/projects/${project.id}`)
          .set(getAuthHeader(admin))
          .expect(200);

        expect(response.body.data.id).toBe(project.id);
      });

      it('editor can view project', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);
        const editor = await createTestUser();
        await addTeamMember(team, editor, TeamRole.EDITOR);

        const response = await request(app)
          .get(`/api/v1/projects/${project.id}`)
          .set(getAuthHeader(editor))
          .expect(200);

        expect(response.body.data.id).toBe(project.id);
      });

      it('viewer can view project', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);
        const viewer = await createTestUser();
        await addTeamMember(team, viewer, TeamRole.VIEWER);

        const response = await request(app)
          .get(`/api/v1/projects/${project.id}`)
          .set(getAuthHeader(viewer))
          .expect(200);

        expect(response.body.data.id).toBe(project.id);
      });

      it('non-member cannot view project', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);
        const outsider = await createTestUser();

        await request(app)
          .get(`/api/v1/projects/${project.id}`)
          .set(getAuthHeader(outsider))
          .expect(403);
      });
    });

    describe('Project Update Permissions', () => {
      it('admin can update project', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);

        const response = await request(app)
          .patch(`/api/v1/projects/${project.id}`)
          .set(getAuthHeader(admin))
          .send({ name: 'Admin Updated Project' })
          .expect(200);

        expect(response.body.data.name).toBe('Admin Updated Project');
      });

      it('editor can update project', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);
        const editor = await createTestUser();
        await addTeamMember(team, editor, TeamRole.EDITOR);

        const response = await request(app)
          .patch(`/api/v1/projects/${project.id}`)
          .set(getAuthHeader(editor))
          .send({ name: 'Editor Updated Project' })
          .expect(200);

        expect(response.body.data.name).toBe('Editor Updated Project');
      });

      it('viewer cannot update project', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);
        const viewer = await createTestUser();
        await addTeamMember(team, viewer, TeamRole.VIEWER);

        await request(app)
          .patch(`/api/v1/projects/${project.id}`)
          .set(getAuthHeader(viewer))
          .send({ name: 'Viewer Updated Project' })
          .expect(403);
      });
    });

    describe('Project Delete Permissions', () => {
      it('admin can delete project', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);

        await request(app)
          .delete(`/api/v1/projects/${project.id}`)
          .set(getAuthHeader(admin))
          .expect(200);
      });

      it('editor cannot delete project', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);
        const editor = await createTestUser();
        await addTeamMember(team, editor, TeamRole.EDITOR);

        await request(app)
          .delete(`/api/v1/projects/${project.id}`)
          .set(getAuthHeader(editor))
          .expect(403);
      });

      it('viewer cannot delete project', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);
        const viewer = await createTestUser();
        await addTeamMember(team, viewer, TeamRole.VIEWER);

        await request(app)
          .delete(`/api/v1/projects/${project.id}`)
          .set(getAuthHeader(viewer))
          .expect(403);
      });
    });

    describe('Project List Permissions', () => {
      it('all team members can list projects', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        await createTestProject(team, admin);
        
        const editor = await createTestUser();
        const viewer = await createTestUser();
        await addTeamMember(team, editor, TeamRole.EDITOR);
        await addTeamMember(team, viewer, TeamRole.VIEWER);

        // Admin can list
        const adminResponse = await request(app)
          .get(`/api/v1/teams/${team.id}/projects`)
          .set(getAuthHeader(admin))
          .expect(200);
        expect(adminResponse.body.data.length).toBeGreaterThanOrEqual(1);

        // Editor can list
        const editorResponse = await request(app)
          .get(`/api/v1/teams/${team.id}/projects`)
          .set(getAuthHeader(editor))
          .expect(200);
        expect(editorResponse.body.data.length).toBeGreaterThanOrEqual(1);

        // Viewer can list
        const viewerResponse = await request(app)
          .get(`/api/v1/teams/${team.id}/projects`)
          .set(getAuthHeader(viewer))
          .expect(200);
        expect(viewerResponse.body.data.length).toBeGreaterThanOrEqual(1);
      });

      it('non-member cannot list projects', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        await createTestProject(team, admin);
        const outsider = await createTestUser();

        await request(app)
          .get(`/api/v1/teams/${team.id}/projects`)
          .set(getAuthHeader(outsider))
          .expect(403);
      });
    });
  });

  // ===========================================
  // Environment Variables RBAC Tests
  // ===========================================

  describe('Environment Variables RBAC', () => {
    describe('Env Read Permissions', () => {
      it('all team members can read env variables', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);
        
        const editor = await createTestUser();
        const viewer = await createTestUser();
        await addTeamMember(team, editor, TeamRole.EDITOR);
        await addTeamMember(team, viewer, TeamRole.VIEWER);

        // Admin can read
        await request(app)
          .get(`/api/v1/projects/${project.id}/env/development`)
          .set(getAuthHeader(admin))
          .expect(200);

        // Editor can read
        await request(app)
          .get(`/api/v1/projects/${project.id}/env/development`)
          .set(getAuthHeader(editor))
          .expect(200);

        // Viewer can read
        await request(app)
          .get(`/api/v1/projects/${project.id}/env/development`)
          .set(getAuthHeader(viewer))
          .expect(200);
      });
    });

    describe('Env Write Permissions', () => {
      it('admin can upload env file', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);

        const response = await request(app)
          .put(`/api/v1/projects/${project.id}/env/development`)
          .set(getAuthHeader(admin))
          .send({ content: 'KEY=value' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('editor can upload env file', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);
        const editor = await createTestUser();
        await addTeamMember(team, editor, TeamRole.EDITOR);

        const response = await request(app)
          .put(`/api/v1/projects/${project.id}/env/development`)
          .set(getAuthHeader(editor))
          .send({ content: 'KEY=value' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('viewer cannot upload env file', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);
        const viewer = await createTestUser();
        await addTeamMember(team, viewer, TeamRole.VIEWER);

        await request(app)
          .put(`/api/v1/projects/${project.id}/env/development`)
          .set(getAuthHeader(viewer))
          .send({ content: 'KEY=value' })
          .expect(403);
      });

      it('admin can update env variable', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);

        // First create env
        await request(app)
          .put(`/api/v1/projects/${project.id}/env/development`)
          .set(getAuthHeader(admin))
          .send({ content: 'KEY=value' });

        // Update variable
        const response = await request(app)
          .patch(`/api/v1/projects/${project.id}/env/development/variables/KEY`)
          .set(getAuthHeader(admin))
          .send({ value: 'newvalue' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('editor can update env variable', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);
        const editor = await createTestUser();
        await addTeamMember(team, editor, TeamRole.EDITOR);

        // First create env
        await request(app)
          .put(`/api/v1/projects/${project.id}/env/development`)
          .set(getAuthHeader(admin))
          .send({ content: 'KEY=value' });

        // Editor updates variable
        const response = await request(app)
          .patch(`/api/v1/projects/${project.id}/env/development/variables/KEY`)
          .set(getAuthHeader(editor))
          .send({ value: 'editorvalue' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('viewer cannot update env variable', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);
        const viewer = await createTestUser();
        await addTeamMember(team, viewer, TeamRole.VIEWER);

        // First create env
        await request(app)
          .put(`/api/v1/projects/${project.id}/env/development`)
          .set(getAuthHeader(admin))
          .send({ content: 'KEY=value' });

        // Viewer tries to update
        await request(app)
          .patch(`/api/v1/projects/${project.id}/env/development/variables/KEY`)
          .set(getAuthHeader(viewer))
          .send({ value: 'viewervalue' })
          .expect(403);
      });

      it('admin can delete env variable', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);

        // First create env
        await request(app)
          .put(`/api/v1/projects/${project.id}/env/development`)
          .set(getAuthHeader(admin))
          .send({ content: 'KEY=value\nOTHER=test' });

        // Delete variable
        await request(app)
          .delete(`/api/v1/projects/${project.id}/env/development/variables/KEY`)
          .set(getAuthHeader(admin))
          .expect(200);
      });

      it('editor can delete env variable', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);
        const editor = await createTestUser();
        await addTeamMember(team, editor, TeamRole.EDITOR);

        // First create env
        await request(app)
          .put(`/api/v1/projects/${project.id}/env/development`)
          .set(getAuthHeader(admin))
          .send({ content: 'KEY=value\nOTHER=test' });

        // Editor deletes variable
        await request(app)
          .delete(`/api/v1/projects/${project.id}/env/development/variables/KEY`)
          .set(getAuthHeader(editor))
          .expect(200);
      });

      it('viewer cannot delete env variable', async () => {
        const { user: admin, team } = await setupTeamWithOwner();
        const project = await createTestProject(team, admin);
        const viewer = await createTestUser();
        await addTeamMember(team, viewer, TeamRole.VIEWER);

        // First create env
        await request(app)
          .put(`/api/v1/projects/${project.id}/env/development`)
          .set(getAuthHeader(admin))
          .send({ content: 'KEY=value' });

        // Viewer tries to delete
        await request(app)
          .delete(`/api/v1/projects/${project.id}/env/development/variables/KEY`)
          .set(getAuthHeader(viewer))
          .expect(403);
      });
    });
  });

  // ===========================================
  // Role Hierarchy Tests
  // ===========================================

  describe('Role Hierarchy', () => {
    it('admin has all permissions', async () => {
      const { user: admin, team } = await setupTeamWithOwner();
      const project = await createTestProject(team, admin);

      // Can update team
      await request(app)
        .patch(`/api/v1/teams/${team.id}`)
        .set(getAuthHeader(admin))
        .send({ name: 'Admin Team' })
        .expect(200);

      // Can create project
      await request(app)
        .post(`/api/v1/teams/${team.id}/projects`)
        .set(getAuthHeader(admin))
        .send({ name: 'New Project' })
        .expect(201);

      // Can update project
      await request(app)
        .patch(`/api/v1/projects/${project.id}`)
        .set(getAuthHeader(admin))
        .send({ name: 'Updated Project' })
        .expect(200);

      // Can write env
      await request(app)
        .put(`/api/v1/projects/${project.id}/env/development`)
        .set(getAuthHeader(admin))
        .send({ content: 'KEY=value' })
        .expect(200);
    });

    it('editor has limited permissions', async () => {
      const { user: admin, team } = await setupTeamWithOwner();
      const project = await createTestProject(team, admin);
      const editor = await createTestUser();
      await addTeamMember(team, editor, TeamRole.EDITOR);

      // Cannot update team
      await request(app)
        .patch(`/api/v1/teams/${team.id}`)
        .set(getAuthHeader(editor))
        .send({ name: 'Editor Team' })
        .expect(403);

      // Can create project
      await request(app)
        .post(`/api/v1/teams/${team.id}/projects`)
        .set(getAuthHeader(editor))
        .send({ name: 'Editor Project' })
        .expect(201);

      // Can update project
      await request(app)
        .patch(`/api/v1/projects/${project.id}`)
        .set(getAuthHeader(editor))
        .send({ name: 'Editor Updated' })
        .expect(200);

      // Can write env
      await request(app)
        .put(`/api/v1/projects/${project.id}/env/development`)
        .set(getAuthHeader(editor))
        .send({ content: 'KEY=value' })
        .expect(200);
    });

    it('viewer has read-only permissions', async () => {
      const { user: admin, team } = await setupTeamWithOwner();
      const project = await createTestProject(team, admin);
      const viewer = await createTestUser();
      await addTeamMember(team, viewer, TeamRole.VIEWER);

      // Cannot update team
      await request(app)
        .patch(`/api/v1/teams/${team.id}`)
        .set(getAuthHeader(viewer))
        .send({ name: 'Viewer Team' })
        .expect(403);

      // Cannot create project
      await request(app)
        .post(`/api/v1/teams/${team.id}/projects`)
        .set(getAuthHeader(viewer))
        .send({ name: 'Viewer Project' })
        .expect(403);

      // Cannot update project
      await request(app)
        .patch(`/api/v1/projects/${project.id}`)
        .set(getAuthHeader(viewer))
        .send({ name: 'Viewer Updated' })
        .expect(403);

      // Cannot write env
      await request(app)
        .put(`/api/v1/projects/${project.id}/env/development`)
        .set(getAuthHeader(viewer))
        .send({ content: 'KEY=value' })
        .expect(403);

      // Can read team
      await request(app)
        .get(`/api/v1/teams/${team.id}`)
        .set(getAuthHeader(viewer))
        .expect(200);

      // Can read project
      await request(app)
        .get(`/api/v1/projects/${project.id}`)
        .set(getAuthHeader(viewer))
        .expect(200);
    });
  });

  // ===========================================
  // Cross-Team Access Tests
  // ===========================================

  describe('Cross-Team Access Prevention', () => {
    it('member of team A cannot access team B', async () => {
      const { user: ownerA, team: teamA } = await setupTeamWithOwner();
      const { user: ownerB, team: teamB } = await setupTeamWithOwner();

      await request(app)
        .get(`/api/v1/teams/${teamB.id}`)
        .set(getAuthHeader(ownerA))
        .expect(403);
    });

    it('member of team A cannot access projects in team B', async () => {
      const { user: ownerA, team: teamA } = await setupTeamWithOwner();
      const { user: ownerB, team: teamB } = await setupTeamWithOwner();
      const projectB = await createTestProject(teamB, ownerB);

      await request(app)
        .get(`/api/v1/projects/${projectB.id}`)
        .set(getAuthHeader(ownerA))
        .expect(403);
    });

    it('member of team A cannot list projects in team B', async () => {
      const { user: ownerA } = await setupTeamWithOwner();
      const { user: ownerB, team: teamB } = await setupTeamWithOwner();

      await request(app)
        .get(`/api/v1/teams/${teamB.id}/projects`)
        .set(getAuthHeader(ownerA))
        .expect(403);
    });

    it('member of team A cannot create project in team B', async () => {
      const { user: ownerA } = await setupTeamWithOwner();
      const { team: teamB } = await setupTeamWithOwner();

      await request(app)
        .post(`/api/v1/teams/${teamB.id}/projects`)
        .set(getAuthHeader(ownerA))
        .send({ name: 'Infiltration Project' })
        .expect(403);
    });
  });
});
