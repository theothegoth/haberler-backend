const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const LOG_DIR = path.join(__dirname, '../logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define transport for daily rotation
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d', // Keep logs for 14 days
  format: logFormat
});

// Create Logger instance
const loggerInstance = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: { service: 'gaste-backend' },
  transports: [
    fileRotateTransport,
    // Also log to error file specifically
    new winston.transports.File({ 
      filename: path.join(LOG_DIR, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// If we're not in production then log to the `console`
if (process.env.NODE_ENV !== 'production') {
  loggerInstance.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

class Logger {
  constructor(module = 'APP') {
    this.module = module;
  }

  info(message, meta = {}) {
    loggerInstance.info(message, { module: this.module, ...meta });
  }

  warn(message, meta = {}) {
    loggerInstance.warn(message, { module: this.module, ...meta });
  }

  error(message, meta = {}) {
    loggerInstance.error(message, { module: this.module, ...meta });
  }

  debug(message, meta = {}) {
    loggerInstance.debug(message, { module: this.module, ...meta });
  }
}

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const logData = {
      method: req.method,
      path: req.path,
      status: statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    const httpLogger = new Logger('HTTP');
    if (statusCode >= 500) {
      httpLogger.error(`${req.method} ${req.path} ${statusCode}`, logData);
    } else if (statusCode >= 400) {
      httpLogger.warn(`${req.method} ${req.path} ${statusCode}`, logData);
    } else {
      httpLogger.info(`${req.method} ${req.path} ${statusCode}`, logData);
    }
  });

  next();
};

module.exports = {
  Logger,
  requestLogger,
  winston: loggerInstance
};
