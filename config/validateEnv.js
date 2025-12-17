const { Logger } = require('../utils/logger');
const logger = new Logger('ENV');

const requiredEnvVars = [
  'YOUTUBE_API_KEY',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET'
];

const optionalEnvVars = {
  PORT: 5000,
  NODE_ENV: 'development'
};

const validateEnv = () => {
  const missing = [];
  const warnings = [];

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    logger.error('Missing required environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  Object.entries(optionalEnvVars).forEach(([varName, defaultValue]) => {
    if (!process.env[varName]) {
      process.env[varName] = String(defaultValue);
      warnings.push(`${varName} not set, using default: ${defaultValue}`);
    }
  });

  if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production-12345') {
    warnings.push('WARNING: Using default JWT_SECRET. Change this in production!');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('WARNING: JWT_SECRET should be at least 32 characters long for security');
  }

  if (process.env.NODE_ENV === 'production' && process.env.DB_PASSWORD === 'postgres') {
    warnings.push('WARNING: Using default database password in production is insecure!');
  }

  if (warnings.length > 0) {
    warnings.forEach(warning => logger.warn(warning));
  }

  logger.info('Environment variables validated successfully');

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : null
  };
};

module.exports = validateEnv;
