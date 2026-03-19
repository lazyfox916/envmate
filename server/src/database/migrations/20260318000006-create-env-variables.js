'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create env_variables table
    await queryInterface.createTable('env_variables', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      env_file_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'env_files',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      key: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      encrypted_value: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      iv: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      auth_tag: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_secret: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      last_modified_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
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

    // Add indexes for env_variables
    await queryInterface.addIndex('env_variables', ['env_file_id']);
    await queryInterface.addIndex('env_variables', ['env_file_id', 'key'], {
      unique: true,
    });
    await queryInterface.addIndex('env_variables', ['key']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('env_variables');
  },
};
