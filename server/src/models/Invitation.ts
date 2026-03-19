import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';
import { TeamRole } from './TeamMember';

// Forward declaration for associated model types
import type Team from './Team';
import type User from './User';

// ===========================================
// Invitation Model
// ===========================================

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export interface InvitationAttributes {
  id: string;
  team_id: string;
  email: string; // Invitee email
  role: TeamRole; // Role to assign on accept
  token_hash: string; // Hashed invitation token
  invited_by: string; // User who sent the invite
  status: InvitationStatus;
  expires_at: Date;
  accepted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface InvitationCreationAttributes
  extends Optional<
    InvitationAttributes,
    'id' | 'role' | 'status' | 'accepted_at' | 'created_at' | 'updated_at'
  > {}

class Invitation
  extends Model<InvitationAttributes, InvitationCreationAttributes>
  implements InvitationAttributes
{
  declare id: string;
  declare team_id: string;
  declare email: string;
  declare role: TeamRole;
  declare token_hash: string;
  declare invited_by: string;
  declare status: InvitationStatus;
  declare expires_at: Date;
  declare accepted_at: Date | null;
  declare created_at: Date;
  declare updated_at: Date;

  // Association properties (populated via include)
  declare team?: Team;
  declare inviter?: User;

  // Check if invitation is still valid
  isValid(): boolean {
    return (
      this.status === InvitationStatus.PENDING &&
      this.expires_at > new Date()
    );
  }

  // Check if invitation has expired
  isExpired(): boolean {
    return this.expires_at <= new Date();
  }
}

Invitation.init(
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
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    role: {
      type: DataTypes.ENUM(...Object.values(TeamRole)),
      allowNull: false,
      defaultValue: TeamRole.VIEWER,
    },
    token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    invited_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(InvitationStatus)),
      allowNull: false,
      defaultValue: InvitationStatus.PENDING,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    accepted_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'invitations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['team_id'] },
      { fields: ['email'] },
      { fields: ['token_hash'] },
      { fields: ['status'] },
      { fields: ['expires_at'] },
      // Prevent duplicate pending invitations for same email in same team
      {
        unique: true,
        fields: ['team_id', 'email'],
        where: { status: InvitationStatus.PENDING },
      },
    ],
  }
);

export default Invitation;
