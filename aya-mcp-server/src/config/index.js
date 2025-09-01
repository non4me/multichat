import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

// Load default configuration
const defaultConfig = JSON.parse(
  readFileSync(join(__dirname, '../../config/default.json'), 'utf-8')
);

// Load prompts configuration
const prompts = JSON.parse(
  readFileSync(join(__dirname, '../../config/prompts.json'), 'utf-8')
);

/**
 * Application configuration with environment variable overrides
 */
class Config {
  constructor() {
    this.config = this.mergeWithEnv(defaultConfig);
    this.prompts = prompts;
  }

  /**
   * Merge default config with environment variables
   */
  mergeWithEnv(config) {
    return {
      ...config,
      server: {
        ...config.server,
        port: parseInt(process.env.PORT) || config.server.port,
        host: process.env.HOST || config.server.host
      },
      aya: {
        ...config.aya,
        baseUrl: process.env.AYA_MODEL_URL || process.env.OLLAMA_HOST || config.aya.baseUrl,
        modelName: process.env.AYA_MODEL_NAME || process.env.OLLAMA_MODEL || config.aya.modelName,
        apiKey: process.env.AYA_API_KEY
      },
      auth: {
        ...config.auth,
        jwtSecret: process.env.JWT_SECRET || this.generateSecret(),
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || config.auth.jwtExpiresIn,
        masterApiKey: process.env.MASTER_API_KEY,
        allowedApiKeys: process.env.ALLOWED_API_KEYS ? 
          process.env.ALLOWED_API_KEYS.split(',').map(k => k.trim()) : []
      },
      cache: {
        ...config.cache,
        ttl: parseInt(process.env.CACHE_TTL) || config.cache.ttl,
        redisUrl: process.env.REDIS_URL
      },
      logging: {
        ...config.logging,
        level: process.env.LOG_LEVEL || config.logging.level,
        logDir: process.env.LOG_DIR || config.logging.logDir
      }
    };
  }

  /**
   * Generate a secure JWT secret if not provided
   */
  generateSecret() {
    const crypto = await import('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get configuration value by path
   */
  get(path, defaultValue = undefined) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config) ?? defaultValue;
  }

  /**
   * Get prompts configuration
   */
  getPrompts() {
    return this.prompts;
  }

  /**
   * Get translation prompt template
   */
  getTranslationPrompt(sourceLanguage, targetLanguage, context = 'chat') {
    const { templates, languageMapping, contextualHints } = this.prompts.translation;
    
    const sourceLangName = languageMapping[sourceLanguage] || sourceLanguage;
    const targetLangName = languageMapping[targetLanguage] || targetLanguage;
    const contextHint = contextualHints[context] || contextualHints.chat;

    return {
      system: this.prompts.translation.systemPrompt,
      instruction: templates.translate.instruction
        .replace('{sourceLanguage}', sourceLangName)
        .replace('{targetLanguage}', targetLangName),
      context: contextHint
    };
  }

  /**
   * Get language detection prompt
   */
  getLanguageDetectionPrompt() {
    return {
      system: this.prompts.translation.systemPrompt,
      instruction: this.prompts.translation.templates.detectLanguage.instruction
    };
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];

    if (!this.config.auth.jwtSecret || this.config.auth.jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }

    if (!this.config.aya.baseUrl) {
      errors.push('AYA_MODEL_URL or OLLAMA_HOST must be configured');
    }

    if (process.env.NODE_ENV === 'production' && !this.config.auth.masterApiKey) {
      errors.push('MASTER_API_KEY is required in production');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    return true;
  }
}

export default new Config();