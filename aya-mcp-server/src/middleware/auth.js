import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Authentication middleware and utilities
 */
class AuthService {
  constructor() {
    this.authConfig = config.get('auth');
  }

  /**
   * Generate API key
   */
  generateApiKey(length = null) {
    const keyLength = length || this.authConfig.apiKeyLength;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < keyLength; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Hash API key
   */
  async hashApiKey(apiKey) {
    return bcrypt.hash(apiKey, this.authConfig.bcryptRounds);
  }

  /**
   * Verify API key
   */
  async verifyApiKey(apiKey, hashedKey) {
    return bcrypt.compare(apiKey, hashedKey);
  }

  /**
   * Generate JWT token
   */
  generateJwtToken(payload) {
    return jwt.sign(
      {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        jti: uuidv4()
      },
      this.authConfig.jwtSecret,
      {
        expiresIn: this.authConfig.jwtExpiresIn,
        issuer: 'aya-mcp-server',
        audience: 'aya-mcp-client'
      }
    );
  }

  /**
   * Verify JWT token
   */
  verifyJwtToken(token) {
    try {
      return jwt.verify(token, this.authConfig.jwtSecret, {
        issuer: 'aya-mcp-server',
        audience: 'aya-mcp-client'
      });
    } catch (error) {
      logger.error('JWT verification failed', error);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Express middleware for API key authentication
   */
  authenticateApiKey = (req, res, next) => {
    const apiKey = this.extractApiKey(req);
    
    if (!apiKey) {
      logger.logAuthEvent('api_key_missing', null, false, { 
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        error: 'API key required',
        message: 'Please provide a valid API key in the Authorization header'
      });
    }

    // Check against allowed API keys
    const allowedKeys = this.authConfig.allowedApiKeys || [];
    const masterKey = this.authConfig.masterApiKey;
    
    const isValidKey = allowedKeys.includes(apiKey) || apiKey === masterKey;
    
    if (isValidKey) {
      req.auth = {
        type: 'api_key',
        keyId: apiKey === masterKey ? 'master' : this.getKeyId(apiKey),
        isMaster: apiKey === masterKey
      };
      
      logger.logAuthEvent('api_key_success', req.auth.keyId, true, { 
        ip: req.ip,
        isMaster: req.auth.isMaster
      });
      
      next();
    } else {
      logger.logAuthEvent('api_key_invalid', null, false, { 
        ip: req.ip,
        providedKey: apiKey.substring(0, 8) + '...',
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }
  };

  /**
   * Express middleware for JWT authentication
   */
  authenticateJwt = (req, res, next) => {
    const token = this.extractJwtToken(req);
    
    if (!token) {
      logger.logAuthEvent('jwt_missing', null, false, { 
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        error: 'JWT token required',
        message: 'Please provide a valid JWT token in the Authorization header'
      });
    }

    try {
      const decoded = this.verifyJwtToken(token);
      
      req.auth = {
        type: 'jwt',
        userId: decoded.sub || decoded.userId,
        payload: decoded
      };
      
      logger.logAuthEvent('jwt_success', req.auth.userId, true, { 
        ip: req.ip,
        tokenId: decoded.jti
      });
      
      next();
    } catch (error) {
      logger.logAuthEvent('jwt_invalid', null, false, { 
        ip: req.ip,
        error: error.message,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        error: 'Invalid JWT token',
        message: error.message
      });
    }
  };

  /**
   * Flexible authentication middleware (API key or JWT)
   */
  authenticate = (req, res, next) => {
    const authHeader = req.get('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide either an API key or JWT token'
      });
    }

    // Try JWT first (Bearer token)
    if (authHeader.startsWith('Bearer ')) {
      return this.authenticateJwt(req, res, next);
    }
    
    // Fallback to API key
    return this.authenticateApiKey(req, res, next);
  };

  /**
   * Extract API key from request
   */
  extractApiKey(req) {
    const authHeader = req.get('Authorization');
    
    if (authHeader) {
      // Support multiple formats:
      // Authorization: ApiKey your_key_here
      // Authorization: your_key_here
      // Authorization: Bearer your_key_here (if not JWT)
      if (authHeader.startsWith('ApiKey ')) {
        return authHeader.substring(7);
      } else if (authHeader.startsWith('Bearer ') && !authHeader.includes('.')) {
        // Simple Bearer token (not JWT which contains dots)
        return authHeader.substring(7);
      } else if (!authHeader.startsWith('Bearer ')) {
        return authHeader;
      }
    }

    // Also check X-API-Key header
    return req.get('X-API-Key');
  }

  /**
   * Extract JWT token from request
   */
  extractJwtToken(req) {
    const authHeader = req.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // JWT tokens contain dots
      if (token.includes('.')) {
        return token;
      }
    }
    
    return null;
  }

  /**
   * Get key ID for logging (first 8 characters)
   */
  getKeyId(apiKey) {
    return apiKey.substring(0, 8) + '...';
  }

  /**
   * Rate limiting check (to be used with express-rate-limit)
   */
  createRateLimitKeyGenerator = () => {
    return (req) => {
      // Use authentication info for rate limiting if available
      if (req.auth) {
        if (req.auth.type === 'api_key') {
          return `api_key:${req.auth.keyId}`;
        } else if (req.auth.type === 'jwt') {
          return `user:${req.auth.userId}`;
        }
      }
      
      // Fallback to IP address
      return req.ip;
    };
  };
}

export default new AuthService();