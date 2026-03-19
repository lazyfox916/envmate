'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    
    // Generate UUIDs
    const adminUserId = uuidv4();
    const editorUserId = uuidv4();
    const viewerUserId = uuidv4();
    const teamId = uuidv4();
    const projectId = uuidv4();

    // Hash passwords (password: "Password123!")
    const passwordHash = await bcrypt.hash('Password123!', 12);

    // Seed users
    await queryInterface.bulkInsert('users', [
      {
        id: adminUserId,
        email: 'admin@example.com',
        password_hash: passwordHash,
        name: 'Admin User',
        email_verified: true,
        failed_login_attempts: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: editorUserId,
        email: 'editor@example.com',
        password_hash: passwordHash,
        name: 'Editor User',
        email_verified: true,
        failed_login_attempts: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: viewerUserId,
        email: 'viewer@example.com',
        password_hash: passwordHash,
        name: 'Viewer User',
        email_verified: true,
        failed_login_attempts: 0,
        created_at: now,
        updated_at: now,
      },
    ]);

    // Seed team
    await queryInterface.bulkInsert('teams', [
      {
        id: teamId,
        name: 'Demo Team',
        description: 'A demo team for development and testing',
        owner_id: adminUserId,
        created_at: now,
        updated_at: now,
      },
    ]);

    // Seed team members
    await queryInterface.bulkInsert('team_members', [
      {
        id: uuidv4(),
        team_id: teamId,
        user_id: adminUserId,
        role: 'admin',
        joined_at: now,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        team_id: teamId,
        user_id: editorUserId,
        role: 'editor',
        joined_at: now,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        team_id: teamId,
        user_id: viewerUserId,
        role: 'viewer',
        joined_at: now,
        created_at: now,
        updated_at: now,
      },
    ]);

    // Seed project
    await queryInterface.bulkInsert('projects', [
      {
        id: projectId,
        team_id: teamId,
        name: 'Demo Project',
        description: 'A demo project for development and testing',
        created_by: adminUserId,
        created_at: now,
        updated_at: now,
      },
    ]);

    console.log('✅ Seed data created successfully');
    console.log('');
    console.log('Test accounts (password: Password123!):');
    console.log('  - admin@example.com (Admin)');
    console.log('  - editor@example.com (Editor)');
    console.log('  - viewer@example.com (Viewer)');
  },

  async down(queryInterface) {
    // Delete in reverse order due to foreign key constraints
    await queryInterface.bulkDelete('env_variables', null, {});
    await queryInterface.bulkDelete('env_files', null, {});
    await queryInterface.bulkDelete('invitations', null, {});
    await queryInterface.bulkDelete('projects', null, {});
    await queryInterface.bulkDelete('team_members', null, {});
    await queryInterface.bulkDelete('teams', null, {});
    await queryInterface.bulkDelete('users', null, {});
  },
};
