import winston from 'winston';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import config from '../config/index.js';

class Logger {
  constructor() {
    this.logger = this.createLogger();
  }

  createLogger() {
    const logConfig = config.get('logging');
    
    // Create logs directory if it doesn't exist
    if (!existsSync(logConfig.logDir)) {
      mkdirSync(logConfig.logDir, { recursive: true });
    }

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        
        if (stack) {
          log += `\n${stack}`;
        }
        
        return log;
      })
    );

    const transports = [];

    // Console transport
    if (logConfig.enableConsole) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        )
      }));
    }

    // File transport
    if (logConfig.enableFile) {
      transports.push(new winston.transports.File({
        filename: join(logConfig.logDir, 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: this.parseSize(logConfig.maxSize),
        maxFiles: logConfig.maxFiles
      }));

      transports.push(new winston.transports.File({
        filename: join(logConfig.logDir, 'combined.log'),
        format: logFormat,
        maxsize: this.parseSize(logConfig.maxSize),
        maxFiles: logConfig.maxFiles
      }));
    }

    return winston.createLogger({
      level: logConfig.level,
      format: logFormat,
      transports,
      exitOnError: false
    });
  }

  parseSize(sizeStr) {
    const match = sizeStr.match(/^(\d+)([kmg]?)$/i);
    if (!match) return 5 * 1024 * 1024; // default 5MB
    
    const size = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 'k': return size * 1024;
      case 'm': return size * 1024 * 1024;
      case 'g': return size * 1024 * 1024 * 1024;
      default: return size;
    }
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  error(message, error = null, meta = {}) {
    const logData = { ...meta };
    if (error) {
      logData.error = error.message;
      logData.stack = error.stack;
    }
    this.logger.error(message, logData);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // Specific methods for different types of operations
  logTranslation(sourceText, targetText, sourceLanguage, targetLanguage, duration, cached = false) {
    this.info('Translation completed', {
      sourceLanguage,
      targetLanguage,
      sourceLength: sourceText.length,
      targetLength: targetText.length,
      duration,
      cached,
      type: 'translation'
    });
  }

  logApiCall(method, endpoint, statusCode, duration, userId = null) {
    this.info('API call', {
      method,
      endpoint,
      statusCode,
      duration,
      userId,
      type: 'api_call'
    });
  }

  logAuthEvent(event, userId, success, details = {}) {
    this.info(`Auth event: ${event}`, {
      userId,
      success,
      ...details,
      type: 'auth'
    });
  }

  logModelInteraction(model, prompt, response, duration, tokens = null) {
    this.debug('Model interaction', {
      model,
      promptLength: prompt.length,
      responseLength: response.length,
      duration,
      tokens,
      type: 'model_interaction'
    });
  }
}

export default new Logger();