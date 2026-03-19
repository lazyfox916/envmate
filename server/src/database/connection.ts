import { Sequelize } from 'sequelize';
import config from '../config/database';

/**
 * Sequelize instance for database operations
 */
const sequelize = new Sequelize({
  host: config.host,
  port: config.port,
  database: config.database,
  username: config.username,
  password: config.password,
  dialect: config.dialect,
  logging: config.logging,
  pool: config.pool,
  dialectOptions: config.dialectOptions,
  define: {
    timestamps: true,
    underscored: true, // Use snake_case for column names
    freezeTableName: true, // Don't pluralize table names
  },
});

/**
 * Test database connection
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    return false;
  }
};

/**
 * Sync all models with database
 * WARNING: Only use in development with alter: true
 * In production, use migrations
 */
export const syncDatabase = async (force: boolean = false): Promise<void> => {
  try {
    if (process.env.NODE_ENV === 'production' && force) {
      throw new Error('Cannot force sync in production!');
    }
    await sequelize.sync({ force, alter: !force && process.env.NODE_ENV === 'development' });
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
};

/**
 * Close database connection
 */
export const closeConnection = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
};

export default sequelize;
