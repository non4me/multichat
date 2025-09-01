import Joi from 'joi';
import ayaService from '../services/ayaService.js';
import cacheService from '../services/cacheService.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Translation controller providing DeepL-compatible API
 */
class TranslationController {
  constructor() {
    this.supportedLanguages = config.get('translation.supportedLanguages');
    this.maxTextLength = config.get('translation.maxTextLength');
  }

  /**
   * Validation schemas
   */
  getValidationSchemas() {
    return {
      translateText: Joi.object({
        text: Joi.string().required().max(this.maxTextLength),
        source_lang: Joi.string().allow('').default('auto'),
        target_lang: Joi.string().required().valid(...this.supportedLanguages),
        context: Joi.string().valid('chat', 'business', 'technical', 'creative', 'news').default('chat'),
        preserve_formatting: Joi.boolean().default(false),
        formality: Joi.string().valid('default', 'more', 'less').default('default')
      }),

      translateTexts: Joi.object({
        text: Joi.array().items(Joi.string().max(this.maxTextLength)).min(1).max(50).required(),
        source_lang: Joi.string().allow('').default('auto'),
        target_lang: Joi.string().required().valid(...this.supportedLanguages),
        context: Joi.string().valid('chat', 'business', 'technical', 'creative', 'news').default('chat')
      }),

      detectLanguage: Joi.object({
        text: Joi.string().required().max(1000)
      })
    };
  }

  /**
   * Translate single text (DeepL-compatible endpoint)
   * POST /v2/translate
   */
  translateText = async (req, res) => {
    const startTime = Date.now();

    try {
      // Validate request
      const schemas = this.getValidationSchemas();
      const { error, value } = schemas.translateText.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          error: 'Bad Request',
          message: error.details[0].message
        });
      }

      const { text, source_lang, target_lang, context } = value;
      
      // Auto-detect source language if needed
      let sourceLanguage = source_lang;
      if (sourceLanguage === 'auto' || sourceLanguage === '') {
        sourceLanguage = await this.detectLanguage(text);
      }

      // Check if translation is needed
      if (sourceLanguage === target_lang) {
        return res.json({
          translations: [{
            detected_source_language: sourceLanguage,
            text: text
          }]
        });
      }

      // Try cache first
      const cached = cacheService.getTranslation(text, sourceLanguage, target_lang, context);
      if (cached) {
        const duration = Date.now() - startTime;
        
        logger.logTranslation(text, cached.translatedText, sourceLanguage, target_lang, duration, true);
        
        return res.json({
          translations: [{
            detected_source_language: sourceLanguage,
            text: cached.translatedText
          }]
        });
      }

      // Perform translation
      const result = await ayaService.translateText(text, sourceLanguage, target_lang, context);
      
      // Cache the result
      cacheService.setTranslation(
        text, 
        sourceLanguage, 
        target_lang, 
        result.text, 
        context,
        { 
          usage: result.usage,
          model: result.sourceLanguage 
        }
      );

      const duration = Date.now() - startTime;
      logger.logTranslation(text, result.text, sourceLanguage, target_lang, duration, false);

      res.json({
        translations: [{
          detected_source_language: result.sourceLanguage,
          text: result.text
        }]
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Translation failed', error, {
        duration,
        text: req.body.text?.substring(0, 100),
        source_lang: req.body.source_lang,
        target_lang: req.body.target_lang
      });

      res.status(500).json({
        error: 'Translation Error',
        message: 'Translation service temporarily unavailable'
      });
    }
  };

  /**
   * Translate multiple texts (batch translation)
   * POST /v2/translate (with text array)
   */
  translateTexts = async (req, res) => {
    const startTime = Date.now();

    try {
      // Validate request
      const schemas = this.getValidationSchemas();
      const { error, value } = schemas.translateTexts.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          error: 'Bad Request',
          message: error.details[0].message
        });
      }

      const { text: texts, source_lang, target_lang, context } = value;
      
      // Auto-detect source language for first text if needed
      let sourceLanguage = source_lang;
      if (sourceLanguage === 'auto' || sourceLanguage === '') {
        sourceLanguage = await this.detectLanguage(texts[0]);
      }

      const translations = [];
      
      for (const text of texts) {
        // Check if translation is needed
        if (sourceLanguage === target_lang) {
          translations.push({
            detected_source_language: sourceLanguage,
            text: text
          });
          continue;
        }

        // Try cache first
        const cached = cacheService.getTranslation(text, sourceLanguage, target_lang, context);
        if (cached) {
          translations.push({
            detected_source_language: sourceLanguage,
            text: cached.translatedText
          });
          continue;
        }

        // Perform translation
        const result = await ayaService.translateText(text, sourceLanguage, target_lang, context);
        
        // Cache the result
        cacheService.setTranslation(
          text, 
          sourceLanguage, 
          target_lang, 
          result.text, 
          context,
          { usage: result.usage }
        );

        translations.push({
          detected_source_language: result.sourceLanguage,
          text: result.text
        });
      }

      const duration = Date.now() - startTime;
      logger.info('Batch translation completed', {
        textCount: texts.length,
        sourceLanguage,
        targetLanguage: target_lang,
        duration
      });

      res.json({ translations });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Batch translation failed', error, {
        duration,
        textCount: req.body.text?.length,
        source_lang: req.body.source_lang,
        target_lang: req.body.target_lang
      });

      res.status(500).json({
        error: 'Translation Error',
        message: 'Batch translation service temporarily unavailable'
      });
    }
  };

  /**
   * Detect language of text
   * POST /v2/detect
   */
  detectLanguageEndpoint = async (req, res) => {
    const startTime = Date.now();

    try {
      // Validate request
      const schemas = this.getValidationSchemas();
      const { error, value } = schemas.detectLanguage.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          error: 'Bad Request',
          message: error.details[0].message
        });
      }

      const { text } = value;
      const detectedLanguage = await this.detectLanguage(text);
      
      const duration = Date.now() - startTime;
      logger.info('Language detection completed', {
        detectedLanguage,
        textLength: text.length,
        duration
      });

      res.json({
        detections: [{
          language: detectedLanguage,
          confidence: 0.95 // aya-expanse doesn't provide confidence, so we use a default
        }]
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Language detection failed', error, {
        duration,
        textLength: req.body.text?.length
      });

      res.status(500).json({
        error: 'Detection Error',
        message: 'Language detection service temporarily unavailable'
      });
    }
  };

  /**
   * Get supported languages (DeepL-compatible)
   * GET /v2/languages
   */
  getSupportedLanguages = async (req, res) => {
    try {
      const type = req.query.type; // 'source' or 'target'
      
      // For simplicity, we support the same languages for both source and target
      const languages = this.supportedLanguages.map(code => ({
        language: code,
        name: this.getLanguageName(code),
        supports_formality: false // aya-expanse doesn't have formality levels
      }));

      res.json(languages);

    } catch (error) {
      logger.error('Failed to get supported languages', error);
      res.status(500).json({
        error: 'Service Error',
        message: 'Failed to retrieve supported languages'
      });
    }
  };

  /**
   * Get translation usage statistics
   * GET /v2/usage
   */
  getUsage = async (req, res) => {
    try {
      const cacheStats = cacheService.getStats();
      
      res.json({
        character_count: cacheStats.sets * 100, // Rough estimation
        character_limit: 500000, // Mock limit
        cache_stats: cacheStats
      });

    } catch (error) {
      logger.error('Failed to get usage statistics', error);
      res.status(500).json({
        error: 'Service Error',
        message: 'Failed to retrieve usage statistics'
      });
    }
  };

  /**
   * Health check endpoint
   * GET /health
   */
  healthCheck = async (req, res) => {
    try {
      const ayaHealth = await ayaService.healthCheck();
      const cacheStats = cacheService.getStats();

      res.json({
        status: ayaHealth.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          aya_model: ayaHealth,
          cache: {
            healthy: true,
            ...cacheStats
          }
        },
        version: '1.0.0'
      });

    } catch (error) {
      logger.error('Health check failed', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  };

  /**
   * Internal helper to detect language
   */
  async detectLanguage(text) {
    // Try cache first
    const cached = cacheService.getLanguageDetection(text);
    if (cached) {
      return cached;
    }

    // Use aya service
    const detectedLanguage = await ayaService.detectLanguage(text);
    
    // Cache the result
    cacheService.setLanguageDetection(text, detectedLanguage);
    
    return detectedLanguage;
  }

  /**
   * Get human-readable language name
   */
  getLanguageName(code) {
    const languageMapping = config.getPrompts().translation.languageMapping;
    return languageMapping[code] || code.toUpperCase();
  }
}

export default new TranslationController();