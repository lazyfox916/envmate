'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create invitation_status enum
    await queryInterface.sequelize.query(`
      CREATE TYPE "invitation_status" AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'revoked');
    `);

    // Create invitations table
    await queryInterface.createTable('invitations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      team_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'teams',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      role: {
        type: '"team_role"',
        allowNull: false,
        defaultValue: 'viewer',
      },
      token_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      invited_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: {
        type: '"invitation_status"',
        allowNull: false,
        defaultValue: 'pending',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      accepted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes for invitations
    await queryInterface.addIndex('invitations', ['team_id']);
    await queryInterface.addIndex('invitations', ['email']);
    await queryInterface.addIndex('invitations', ['token_hash']);
    await queryInterface.addIndex('invitations', ['status']);
    await queryInterface.addIndex('invitations', ['expires_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('invitations');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "invitation_status";');
  },
};
