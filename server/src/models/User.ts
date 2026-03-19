import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

// ===========================================
// User Model
// ===========================================

export interface UserAttributes {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  email_verified: boolean;
  email_verification_token: string | null;
  email_verification_expires: Date | null;
  password_reset_token: string | null;
  password_reset_expires: Date | null;
  failed_login_attempts: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | 'id'
    | 'email_verified'
    | 'email_verification_token'
    | 'email_verification_expires'
    | 'password_reset_token'
    | 'password_reset_expires'
    | 'failed_login_attempts'
    | 'locked_until'
    | 'last_login_at'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at'
  > {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare password_hash: string;
  declare name: string;
  declare email_verified: boolean;
  declare email_verification_token: string | null;
  declare email_verification_expires: Date | null;
  declare password_reset_token: string | null;
  declare password_reset_expires: Date | null;
  declare failed_login_attempts: number;
  declare locked_until: Date | null;
  declare last_login_at: Date | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;

  // Helper method to check if account is locked
  isLocked(): boolean {
    return this.locked_until !== null && this.locked_until > new Date();
  }

  // Convert to safe JSON (exclude sensitive fields)
  toSafeJSON(): Omit<
    UserAttributes,
    | 'password_hash'
    | 'email_verification_token'
    | 'password_reset_token'
    | 'failed_login_attempts'
    | 'locked_until'
  > {
    const { password_hash, email_verification_token, password_reset_token, failed_login_attempts, locked_until, ...safeUser } = this.toJSON();
    return safeUser;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    email_verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    email_verification_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    password_reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    password_reset_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failed_login_attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    locked_until: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_login_at: {
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
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    paranoid: true, // Enables soft delete
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { unique: true, fields: ['email'], where: { deleted_at: null } },
      { fields: ['email_verification_token'] },
      { fields: ['password_reset_token'] },
    ],
  }
);

export default User;
