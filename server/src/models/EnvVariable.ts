import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

// ===========================================
// Environment Variable Model
// Stores encrypted key-value pairs
// ===========================================

export interface EnvVariableAttributes {
  id: string;
  env_file_id: string;
  key: string; // Variable name (e.g., API_KEY)
  encrypted_value: string; // AES-256-GCM encrypted value
  iv: string; // Initialization vector for encryption
  auth_tag: string; // Authentication tag for GCM
  description: string | null; // Optional description of the variable
  is_secret: boolean; // Mark as secret (for UI masking)
  created_by: string;
  last_modified_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface EnvVariableCreationAttributes
  extends Optional<
    EnvVariableAttributes,
    'id' | 'description' | 'is_secret' | 'created_at' | 'updated_at'
  > {}

class EnvVariable
  extends Model<EnvVariableAttributes, EnvVariableCreationAttributes>
  implements EnvVariableAttributes
{
  declare id: string;
  declare env_file_id: string;
  declare key: string;
  declare encrypted_value: string;
  declare iv: string;
  declare auth_tag: string;
  declare description: string | null;
  declare is_secret: boolean;
  declare created_by: string;
  declare last_modified_by: string;
  declare created_at: Date;
  declare updated_at: Date;
}

EnvVariable.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    env_file_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'env_files',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        // Only allow valid env variable names
        is: /^[A-Za-z_][A-Za-z0-9_]*$/,
      },
    },
    encrypted_value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    iv: {
      type: DataTypes.STRING(32), // 16 bytes hex encoded
      allowNull: false,
    },
    auth_tag: {
      type: DataTypes.STRING(32), // 16 bytes hex encoded
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_secret: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    last_modified_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
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
    tableName: 'env_variables',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['env_file_id'] },
      { unique: true, fields: ['env_file_id', 'key'] }, // Each key unique per env file
      { fields: ['key'] },
    ],
  }
);

export default EnvVariable;
