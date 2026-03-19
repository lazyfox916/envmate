import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

// ===========================================
// Team Model
// ===========================================

export interface TeamAttributes {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TeamCreationAttributes
  extends Optional<TeamAttributes, 'id' | 'description' | 'created_at' | 'updated_at' | 'deleted_at'> {}

class Team extends Model<TeamAttributes, TeamCreationAttributes> implements TeamAttributes {
  declare id: string;
  declare name: string;
  declare description: string | null;
  declare owner_id: string;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

Team.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    owner_id: {
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
    tableName: 'teams',
    paranoid: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['owner_id'] },
      { fields: ['name'] },
    ],
  }
);

export default Team;
