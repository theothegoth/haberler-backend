const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

class Logger {
  constructor(module = 'APP') {
    this.module = module;
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      module: this.module,
      message,
      ...(data && { data })
    };
    return JSON.stringify(logEntry);
  }

  writeToFile(level, message) {
    const filename = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
    const logLine = message + '\n';

    fs.appendFile(filename, logLine, (err) => {
      if (err) console.error('Log yazma hatası:', err);
    });
  }

  log(level, message, data = null) {
    const formattedMessage = this.formatMessage(level, message, data);

    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(`[${this.module}] ${message}`, data || '');
        break;
      case LOG_LEVELS.WARN:
        console.warn(`[${this.module}] ${message}`, data || '');
        break;
      case LOG_LEVELS.INFO:
        console.log(`[${this.module}] ${message}`, data || '');
        break;
      case LOG_LEVELS.DEBUG:
        if (process.env.NODE_ENV === 'development') {
          console.log(`[${this.module}] [DEBUG] ${message}`, data || '');
        }
        break;
    }

    if (level === LOG_LEVELS.ERROR || level === LOG_LEVELS.WARN) {
      this.writeToFile(level, formattedMessage);
    }
  }

  error(message, data = null) {
    this.log(LOG_LEVELS.ERROR, message, data);
  }

  warn(message, data = null) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  info(message, data = null) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  debug(message, data = null) {
    this.log(LOG_LEVELS.DEBUG, message, data);
  }
}

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const logger = new Logger('HTTP');

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.path} ${res.statusCode}`, logData);
    } else {
      logger.info(`${req.method} ${req.path} ${res.statusCode}`, logData);
    }
  });

  next();
};

module.exports = {
  Logger,
  requestLogger,
  LOG_LEVELS
};
