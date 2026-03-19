/**
 * Models Index
 * Exports all models and sets up associations
 */

import User from './User';
import Team from './Team';
import TeamMember, { TeamRole } from './TeamMember';
import Project from './Project';
import EnvFile, { EnvironmentType } from './EnvFile';
import EnvVariable from './EnvVariable';
import Invitation, { InvitationStatus } from './Invitation';
import AuditLog, { AuditAction, AuditEntityType, AuditStatus } from './AuditLog';

// ===========================================
// Define Associations
// ===========================================

// User <-> Team (Owner relationship)
User.hasMany(Team, { foreignKey: 'owner_id', as: 'ownedTeams' });
Team.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// User <-> Team (Member relationship through TeamMember)
User.belongsToMany(Team, {
  through: TeamMember,
  foreignKey: 'user_id',
  otherKey: 'team_id',
  as: 'teams',
});
Team.belongsToMany(User, {
  through: TeamMember,
  foreignKey: 'team_id',
  otherKey: 'user_id',
  as: 'members',
});

// Direct access to TeamMember from User and Team
User.hasMany(TeamMember, { foreignKey: 'user_id', as: 'teamMemberships' });
TeamMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Team.hasMany(TeamMember, { foreignKey: 'team_id', as: 'teamMembers' });
TeamMember.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

// Team <-> Project
Team.hasMany(Project, { foreignKey: 'team_id', as: 'projects' });
Project.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

// User <-> Project (Creator)
User.hasMany(Project, { foreignKey: 'created_by', as: 'createdProjects' });
Project.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Project <-> EnvFile
Project.hasMany(EnvFile, { foreignKey: 'project_id', as: 'envFiles' });
EnvFile.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// User <-> EnvFile (Creator and LastModifier)
User.hasMany(EnvFile, { foreignKey: 'created_by', as: 'createdEnvFiles' });
EnvFile.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(EnvFile, { foreignKey: 'last_modified_by', as: 'modifiedEnvFiles' });
EnvFile.belongsTo(User, { foreignKey: 'last_modified_by', as: 'lastModifier' });

// EnvFile <-> EnvVariable
EnvFile.hasMany(EnvVariable, { foreignKey: 'env_file_id', as: 'variables', onDelete: 'CASCADE' });
EnvVariable.belongsTo(EnvFile, { foreignKey: 'env_file_id', as: 'envFile' });

// User <-> EnvVariable (Creator and LastModifier)
User.hasMany(EnvVariable, { foreignKey: 'created_by', as: 'createdVariables' });
EnvVariable.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(EnvVariable, { foreignKey: 'last_modified_by', as: 'modifiedVariables' });
EnvVariable.belongsTo(User, { foreignKey: 'last_modified_by', as: 'lastModifier' });

// Team <-> Invitation
Team.hasMany(Invitation, { foreignKey: 'team_id', as: 'invitations' });
Invitation.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

// User <-> Invitation (Inviter)
User.hasMany(Invitation, { foreignKey: 'invited_by', as: 'sentInvitations' });
Invitation.belongsTo(User, { foreignKey: 'invited_by', as: 'inviter' });

// ===========================================
// Export Models and Enums
// ===========================================

// User <-> AuditLog (for tracking user actions)
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export {
  User,
  Team,
  TeamMember,
  TeamRole,
  Project,
  EnvFile,
  EnvironmentType,
  EnvVariable,
  Invitation,
  InvitationStatus,
  AuditLog,
  AuditAction,
  AuditEntityType,
  AuditStatus,
};

// Default export for convenience
export default {
  User,
  Team,
  TeamMember,
  Project,
  EnvFile,
  EnvVariable,
  Invitation,
  AuditLog,
};
