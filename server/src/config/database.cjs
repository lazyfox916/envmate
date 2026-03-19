require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const baseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'envmate',
  username: process.env.DB_USER || 'envmate',
  password: process.env.DB_PASSWORD || 'envmate_dev_password',
  dialect: 'postgres',
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    acquire: 30000,
    idle: 10000,
  },
};

// Enable SSL in production
if (isProduction && process.env.DB_SSL === 'true') {
  baseConfig.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  };
}

module.exports = {
  development: {
    ...baseConfig,
    logging: console.log,
  },
  test: {
    ...baseConfig,
    database: process.env.DB_NAME_TEST || 'envmate_test',
    logging: false,
  },
  production: {
    ...baseConfig,
    logging: false,
  },
};
