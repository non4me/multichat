import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { existsSync, mkdirSync } from 'fs';
import config from './config/index.js';
import logger from './utils/logger.js';
import routes from './routes/index.js';

/**
 * Aya-Expanse MCP Translation Server
 */
class AyaMCPServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.config = config;
  }

  /**
   * Initialize the server
   */
  async initialize() {
    try {
      // Validate configuration
      this.config.validate();
      
      // Create necessary directories
      this.createDirectories();
      
      // Configure middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();
      
      logger.info('Server initialization completed');
      
    } catch (error) {
      logger.error('Server initialization failed', error);
      throw error;
    }
  }

  /**
   * Create necessary directories
   */
  createDirectories() {
    const logDir = this.config.get('logging.logDir');
    
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
      logger.info(`Created log directory: ${logDir}`);
    }
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP for API server
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    }));

    // CORS configuration
    const corsOptions = this.config.get('server.cors');
    this.app.use(cors(corsOptions));

    // Body parsing
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        // Store raw body for potential verification needs
        req.rawBody = buf;
      }
    }));
    
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // Trust proxy (for rate limiting and IP detection)
    this.app.set('trust proxy', 1);

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.id = this.generateRequestId();
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // Request logging middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      logger.debug('Incoming request', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentLength: req.get('Content-Length') || 0
      });

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.debug('Request completed', {
          requestId: req.id,
          statusCode: res.statusCode,
          duration
        });
      });

      next();
    });
  }

  /**
   * Setup application routes
   */
  setupRoutes() {
    // Mount main routes
    this.app.use('/', routes);

    // 404 handler
    this.app.use('*', (req, res) => {
      logger.warn('Route not found', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip
      });

      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        available_endpoints: [
          'GET /',
          'GET /health',
          'POST /v2/translate',
          'POST /v2/detect',
          'GET /v2/languages',
          'GET /v2/usage',
          'POST /auth/token'
        ]
      });
    });
  }

  /**
   * Setup global error handling
   */
  setupErrorHandling() {
    // Global error handler
    this.app.use((err, req, res, next) => {
      logger.error('Unhandled error', err, {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip
      });

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: isDevelopment ? err.message : 'An unexpected error occurred',
        requestId: req.id,
        ...(isDevelopment && { stack: err.stack })
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', reason, {
        promise: promise.toString()
      });
      this.gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Handle termination signals
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.gracefulShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.gracefulShutdown('SIGINT');
    });
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await this.initialize();
      
      const port = this.config.get('server.port');
      const host = this.config.get('server.host');

      this.server = this.app.listen(port, host, () => {
        logger.info('Server started successfully', {
          port,
          host,
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0',
          pid: process.pid
        });

        // Log configuration summary (without sensitive data)
        logger.info('Server configuration', {
          aya_model: this.config.get('aya.modelName'),
          aya_url: this.config.get('aya.baseUrl'),
          supported_languages: this.config.get('translation.supportedLanguages').length,
          cache_max_size: this.config.get('cache.maxSize'),
          cache_ttl: this.config.get('cache.ttl'),
          log_level: this.config.get('logging.level')
        });
      });

      this.server.on('error', (error) => {
        logger.error('Server error', error);
        throw error;
      });

    } catch (error) {
      logger.error('Failed to start server', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown(reason) {
    logger.info(`Graceful shutdown initiated: ${reason}`);

    if (this.server) {
      this.server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Force shutdown due to timeout');
        process.exit(1);
      }, 30000);
    } else {
      process.exit(0);
    }
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get server instance (for testing)
   */
  getApp() {
    return this.app;
  }

  /**
   * Get server configuration
   */
  getConfig() {
    return this.config;
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new AyaMCPServer();
  
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default AyaMCPServer;