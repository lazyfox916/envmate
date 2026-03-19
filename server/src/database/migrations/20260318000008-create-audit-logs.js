'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      // Who performed the action
      user_id: {
        type: Sequelize.UUID,
        allowNull: true, // Null for system events or unauthenticated actions
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      // What action was performed
      action: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Action type: login, logout, create, read, update, delete, etc.',
      },
      // Entity type being acted upon
      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Entity type: user, team, project, env_variable, etc.',
      },
      // Entity ID being acted upon
      entity_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID of the entity being acted upon',
      },
      // Description of the action
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Human-readable description of the action',
      },
      // Metadata (JSON) - additional context
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional context data (no sensitive info)',
      },
      // Request context
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'Client IP address (supports IPv6)',
      },
      user_agent: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Client user agent string',
      },
      request_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Request ID for correlation',
      },
      // Result
      status: {
        type: Sequelize.ENUM('success', 'failure', 'partial'),
        allowNull: false,
        defaultValue: 'success',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if action failed',
      },
      // Timestamp
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Indexes for common queries
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['entity_type']);
    await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
    await queryInterface.addIndex('audit_logs', ['status']);
    await queryInterface.addIndex('audit_logs', ['ip_address']);
    await queryInterface.addIndex('audit_logs', ['request_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs');
  },
};
