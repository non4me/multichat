import express from 'express';
import rateLimit from 'express-rate-limit';
import translationController from '../controllers/translationController.js';
import authService from '../middleware/auth.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Rate limiting configuration
 */
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too Many Requests',
      message
    },
    keyGenerator: authService.createRateLimitKeyGenerator(),
    onLimitReached: (req, res, options) => {
      logger.warn('Rate limit reached', {
        ip: req.ip,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        auth: req.auth
      });
    }
  });
};

// Rate limiting middleware
const generalRateLimit = createRateLimit(
  config.get('server.rateLimit.windowMs'),
  config.get('server.rateLimit.max'),
  'Too many requests, please try again later'
);

const translationRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 translations per 15 minutes
  'Translation rate limit exceeded, please try again in 15 minutes'
);

/**
 * Middleware for logging API calls
 */
const apiLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.logApiCall(
      req.method,
      req.originalUrl,
      res.statusCode,
      duration,
      req.auth?.userId || req.auth?.keyId
    );
  });
  
  next();
};

/**
 * Public routes (no authentication required)
 */

// Health check
router.get('/health', translationController.healthCheck);

// API documentation
router.get('/', (req, res) => {
  res.json({
    name: 'Aya-Expanse MCP Translation Server',
    version: '1.0.0',
    description: 'DeepL-compatible translation API powered by aya-expanse model',
    endpoints: {
      'POST /v2/translate': 'Translate text',
      'POST /v2/detect': 'Detect language',
      'GET /v2/languages': 'Get supported languages',
      'GET /v2/usage': 'Get usage statistics',
      'GET /health': 'Health check',
      'POST /auth/token': 'Generate JWT token (with valid API key)'
    },
    documentation: 'https://github.com/non4me/multichat/tree/main/aya-mcp-server'
  });
});

/**
 * Authentication routes
 */
router.post('/auth/token', 
  generalRateLimit,
  apiLogger,
  authService.authenticateApiKey,
  (req, res) => {
    try {
      const token = authService.generateJwtToken({
        sub: req.auth.keyId,
        keyId: req.auth.keyId,
        isMaster: req.auth.isMaster,
        scope: 'translation'
      });

      res.json({
        access_token: token,
        token_type: 'Bearer',
        expires_in: 86400, // 24 hours
        scope: 'translation'
      });

      logger.logAuthEvent('token_generated', req.auth.keyId, true, {
        isMaster: req.auth.isMaster,
        ip: req.ip
      });

    } catch (error) {
      logger.error('Token generation failed', error);
      res.status(500).json({
        error: 'Token Generation Error',
        message: 'Failed to generate access token'
      });
    }
  }
);

/**
 * DeepL-compatible API routes (v2)
 * All require authentication
 */
const v2Router = express.Router();

// Apply authentication and rate limiting to all v2 routes
v2Router.use(authService.authenticate);
v2Router.use(apiLogger);
v2Router.use(generalRateLimit);

// Translation endpoints
v2Router.post('/translate', translationRateLimit, (req, res) => {
  // Handle both single text and array of texts
  if (Array.isArray(req.body.text)) {
    return translationController.translateTexts(req, res);
  } else {
    return translationController.translateText(req, res);
  }
});

// Language detection
v2Router.post('/detect', translationController.detectLanguageEndpoint);

// Supported languages
v2Router.get('/languages', translationController.getSupportedLanguages);

// Usage statistics
v2Router.get('/usage', translationController.getUsage);

// Mount v2 routes
router.use('/v2', v2Router);

/**
 * Admin routes (master API key required)
 */
const adminRouter = express.Router();

// Admin authentication middleware
const adminAuth = (req, res, next) => {
  if (!req.auth || !req.auth.isMaster) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Master API key required'
    });
  }
  next();
};

adminRouter.use(authService.authenticate);
adminRouter.use(adminAuth);
adminRouter.use(apiLogger);

// Cache management
adminRouter.get('/cache/stats', (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get cache stats', error);
    res.status(500).json({ error: 'Failed to get cache statistics' });
  }
});

adminRouter.post('/cache/clear', (req, res) => {
  try {
    const entriesRemoved = cacheService.clear();
    res.json({
      message: 'Cache cleared successfully',
      entriesRemoved
    });
  } catch (error) {
    logger.error('Failed to clear cache', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

adminRouter.post('/cache/prune', (req, res) => {
  try {
    const entriesRemoved = cacheService.prune();
    res.json({
      message: 'Stale cache entries pruned',
      entriesRemoved
    });
  } catch (error) {
    logger.error('Failed to prune cache', error);
    res.status(500).json({ error: 'Failed to prune cache' });
  }
});

// Generate new API key
adminRouter.post('/keys/generate', (req, res) => {
  try {
    const { length, description } = req.body;
    const apiKey = authService.generateApiKey(length);
    
    res.json({
      api_key: apiKey,
      description: description || 'Generated API key',
      created_at: new Date().toISOString(),
      note: 'Add this key to ALLOWED_API_KEYS environment variable to activate'
    });

    logger.info('API key generated', {
      keyId: authService.getKeyId(apiKey),
      description,
      generatedBy: req.auth.keyId
    });

  } catch (error) {
    logger.error('Failed to generate API key', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// Server statistics
adminRouter.get('/stats', (req, res) => {
  try {
    const stats = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cache: cacheService.getStats(),
      timestamp: new Date().toISOString()
    };
    
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get server stats', error);
    res.status(500).json({ error: 'Failed to get server statistics' });
  }
});

// Mount admin routes
router.use('/admin', adminRouter);

/**
 * Error handling middleware
 */
router.use((err, req, res, next) => {
  logger.error('Unhandled route error', err, {
    method: req.method,
    url: req.originalUrl,
    body: req.body
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
});

export default router;