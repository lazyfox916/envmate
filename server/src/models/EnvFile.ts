import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

// ===========================================
// Environment File Model
// ===========================================

export enum EnvironmentType {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
  CUSTOM = 'custom',
}

export interface EnvFileAttributes {
  id: string;
  project_id: string;
  name: string; // e.g., ".env", ".env.local", ".env.production"
  environment: EnvironmentType;
  description: string | null;
  created_by: string;
  last_modified_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface EnvFileCreationAttributes
  extends Optional<
    EnvFileAttributes,
    'id' | 'environment' | 'description' | 'created_at' | 'updated_at' | 'deleted_at'
  > {}

class EnvFile extends Model<EnvFileAttributes, EnvFileCreationAttributes> implements EnvFileAttributes {
  declare id: string;
  declare project_id: string;
  declare name: string;
  declare environment: EnvironmentType;
  declare description: string | null;
  declare created_by: string;
  declare last_modified_by: string;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

EnvFile.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    environment: {
      type: DataTypes.ENUM(...Object.values(EnvironmentType)),
      allowNull: false,
      defaultValue: EnvironmentType.DEVELOPMENT,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'env_files',
    paranoid: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['project_id'] },
      { fields: ['environment'] },
      { unique: true, fields: ['project_id', 'name'], where: { deleted_at: null } },
    ],
  }
);

export default EnvFile;
