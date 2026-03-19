'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create team_role enum type
    await queryInterface.sequelize.query(`
      CREATE TYPE "team_role" AS ENUM ('admin', 'editor', 'viewer');
    `);

    // Create team_members table
    await queryInterface.createTable('team_members', {
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
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      role: {
        type: '"team_role"',
        allowNull: false,
        defaultValue: 'viewer',
      },
      joined_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

    // Add indexes for team_members
    await queryInterface.addIndex('team_members', ['team_id', 'user_id'], {
      unique: true,
    });
    await queryInterface.addIndex('team_members', ['team_id']);
    await queryInterface.addIndex('team_members', ['user_id']);
    await queryInterface.addIndex('team_members', ['role']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('team_members');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "team_role";');
  },
};
