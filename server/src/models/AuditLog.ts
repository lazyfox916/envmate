import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

// ===========================================
// Audit Log Model
// Stores security and action audit trail
// ===========================================

export enum AuditAction {
  // Authentication
  LOGIN = 'login',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  REGISTER = 'register',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGE = 'password_change',
  EMAIL_VERIFIED = 'email_verified',
  ACCOUNT_LOCKED = 'account_locked',
  
  // User actions
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  
  // Team actions
  TEAM_CREATED = 'team_created',
  TEAM_UPDATED = 'team_updated',
  TEAM_DELETED = 'team_deleted',
  
  // Team membership
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  MEMBER_ROLE_CHANGED = 'member_role_changed',
  TEAM_LEFT = 'team_left',
  
  // Invitation actions
  INVITATION_SENT = 'invitation_sent',
  INVITATION_ACCEPTED = 'invitation_accepted',
  INVITATION_REJECTED = 'invitation_rejected',
  INVITATION_REVOKED = 'invitation_revoked',
  
  // Project actions
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_DELETED = 'project_deleted',
  
  // Environment variable actions
  ENV_UPLOADED = 'env_uploaded',
  ENV_ACCESSED = 'env_accessed',
  ENV_EXPORTED = 'env_exported',
  ENV_VARIABLE_CREATED = 'env_variable_created',
  ENV_VARIABLE_UPDATED = 'env_variable_updated',
  ENV_VARIABLE_DELETED = 'env_variable_deleted',
  
  // Security events
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  RATE_LIMITED = 'rate_limited',
  INVALID_TOKEN = 'invalid_token',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PERMISSION_DENIED = 'permission_denied',
}

export enum AuditEntityType {
  USER = 'user',
  TEAM = 'team',
  TEAM_MEMBER = 'team_member',
  PROJECT = 'project',
  ENV_FILE = 'env_file',
  ENV_VARIABLE = 'env_variable',
  INVITATION = 'invitation',
  SESSION = 'session',
  SYSTEM = 'system',
}

export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
}

export interface AuditLogAttributes {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  status: AuditStatus;
  error_message: string | null;
  created_at: Date;
}

export interface AuditLogCreationAttributes
  extends Optional<
    AuditLogAttributes,
    'id' | 'user_id' | 'entity_id' | 'description' | 'metadata' | 'ip_address' | 'user_agent' | 'request_id' | 'status' | 'error_message' | 'created_at'
  > {}

class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  declare id: string;
  declare user_id: string | null;
  declare action: string;
  declare entity_type: string;
  declare entity_id: string | null;
  declare description: string | null;
  declare metadata: Record<string, unknown>;
  declare ip_address: string | null;
  declare user_agent: string | null;
  declare request_id: string | null;
  declare status: AuditStatus;
  declare error_message: string | null;
  declare created_at: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    request_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(AuditStatus)),
      allowNull: false,
      defaultValue: AuditStatus.SUCCESS,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['action'] },
      { fields: ['entity_type'] },
      { fields: ['entity_type', 'entity_id'] },
      { fields: ['created_at'] },
      { fields: ['status'] },
      { fields: ['ip_address'] },
      { fields: ['request_id'] },
    ],
  }
);

export default AuditLog;
