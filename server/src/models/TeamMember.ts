import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

// ===========================================
// Team Member Model (Junction Table)
// ===========================================

export enum TeamRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export interface TeamMemberAttributes {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface TeamMemberCreationAttributes
  extends Optional<TeamMemberAttributes, 'id' | 'role' | 'joined_at' | 'created_at' | 'updated_at'> {}

class TeamMember
  extends Model<TeamMemberAttributes, TeamMemberCreationAttributes>
  implements TeamMemberAttributes
{
  declare id: string;
  declare team_id: string;
  declare user_id: string;
  declare role: TeamRole;
  declare joined_at: Date;
  declare created_at: Date;
  declare updated_at: Date;

  // Check if member has admin privileges
  isAdmin(): boolean {
    return this.role === TeamRole.ADMIN;
  }

  // Check if member can edit (admin or editor)
  canEdit(): boolean {
    return this.role === TeamRole.ADMIN || this.role === TeamRole.EDITOR;
  }

  // Check if member can view (all roles)
  canView(): boolean {
    return true;
  }
}

TeamMember.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    team_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'teams',
        key: 'id',
      },
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    role: {
      type: DataTypes.ENUM(...Object.values(TeamRole)),
      allowNull: false,
      defaultValue: TeamRole.VIEWER,
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'team_members',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['team_id', 'user_id'] }, // Each user can only be in a team once
      { fields: ['team_id'] },
      { fields: ['user_id'] },
      { fields: ['role'] },
    ],
  }
);

export default TeamMember;
