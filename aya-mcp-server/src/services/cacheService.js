import { LRU } from 'lru-cache';
import crypto from 'crypto';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Caching service for translation results
 */
class CacheService {
  constructor() {
    this.cacheConfig = config.get('cache');
    this.cache = this.initializeCache();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * Initialize LRU cache
   */
  initializeCache() {
    return new LRU({
      max: this.cacheConfig.maxSize,
      ttl: this.cacheConfig.ttl,
      allowStale: this.cacheConfig.staleWhileRevalidate,
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });
  }

  /**
   * Generate cache key for translation
   */
  generateTranslationKey(text, sourceLanguage, targetLanguage, context = 'chat') {
    const normalizedText = text.trim().toLowerCase();
    const keyData = `${sourceLanguage}:${targetLanguage}:${context}:${normalizedText}`;
    return crypto.createHash('sha256').update(keyData).digest('hex');
  }

  /**
   * Generate cache key for language detection
   */
  generateLanguageDetectionKey(text) {
    const normalizedText = text.trim().toLowerCase();
    return `lang_detect:${crypto.createHash('sha256').update(normalizedText).digest('hex')}`;
  }

  /**
   * Get cached translation
   */
  getTranslation(text, sourceLanguage, targetLanguage, context = 'chat') {
    const key = this.generateTranslationKey(text, sourceLanguage, targetLanguage, context);
    const cached = this.cache.get(key);
    
    if (cached) {
      this.stats.hits++;
      logger.debug('Cache hit for translation', {
        key: key.substring(0, 16) + '...',
        sourceLanguage,
        targetLanguage,
        context
      });
      return cached;
    }
    
    this.stats.misses++;
    logger.debug('Cache miss for translation', {
      key: key.substring(0, 16) + '...',
      sourceLanguage,
      targetLanguage,
      context
    });
    
    return null;
  }

  /**
   * Cache translation result
   */
  setTranslation(text, sourceLanguage, targetLanguage, translatedText, context = 'chat', metadata = {}) {
    const key = this.generateTranslationKey(text, sourceLanguage, targetLanguage, context);
    
    const cacheEntry = {
      sourceText: text,
      translatedText,
      sourceLanguage,
      targetLanguage,
      context,
      timestamp: Date.now(),
      metadata
    };
    
    this.cache.set(key, cacheEntry);
    this.stats.sets++;
    
    logger.debug('Cached translation', {
      key: key.substring(0, 16) + '...',
      sourceLanguage,
      targetLanguage,
      context,
      sourceLength: text.length,
      translatedLength: translatedText.length
    });
  }

  /**
   * Get cached language detection
   */
  getLanguageDetection(text) {
    const key = this.generateLanguageDetectionKey(text);
    const cached = this.cache.get(key);
    
    if (cached) {
      this.stats.hits++;
      logger.debug('Cache hit for language detection', {
        key: key.substring(0, 16) + '...',
        detectedLanguage: cached.language
      });
      return cached.language;
    }
    
    this.stats.misses++;
    logger.debug('Cache miss for language detection', {
      key: key.substring(0, 16) + '...'
    });
    
    return null;
  }

  /**
   * Cache language detection result
   */
  setLanguageDetection(text, detectedLanguage, confidence = null) {
    const key = this.generateLanguageDetectionKey(text);
    
    const cacheEntry = {
      text,
      language: detectedLanguage,
      confidence,
      timestamp: Date.now()
    };
    
    this.cache.set(key, cacheEntry);
    this.stats.sets++;
    
    logger.debug('Cached language detection', {
      key: key.substring(0, 16) + '...',
      detectedLanguage,
      confidence
    });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.cache.max,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Clear cache
   */
  clear() {
    const sizeBefore = this.cache.size;
    this.cache.clear();
    
    logger.info('Cache cleared', {
      entriesRemoved: sizeBefore
    });
    
    return sizeBefore;
  }

  /**
   * Remove stale entries
   */
  prune() {
    const sizeBefore = this.cache.size;
    this.cache.purgeStale();
    const sizeAfter = this.cache.size;
    
    const removedCount = sizeBefore - sizeAfter;
    
    if (removedCount > 0) {
      logger.info('Pruned stale cache entries', {
        removedCount,
        remainingCount: sizeAfter
      });
    }
    
    return removedCount;
  }

  /**
   * Get cache entries by pattern (for debugging)
   */
  getEntriesByLanguagePair(sourceLanguage, targetLanguage) {
    const entries = [];
    
    for (const [key, value] of this.cache.entries()) {
      if (value.sourceLanguage === sourceLanguage && value.targetLanguage === targetLanguage) {
        entries.push({
          key: key.substring(0, 16) + '...',
          ...value
        });
      }
    }
    
    return entries;
  }

  /**
   * Warm up cache with common translations (optional)
   */
  async warmUp(commonPhrases = []) {
    logger.info('Starting cache warm-up', {
      phrasesCount: commonPhrases.length
    });

    const supportedLanguages = config.get('translation.supportedLanguages');
    let warmedCount = 0;

    for (const phrase of commonPhrases) {
      for (const sourceLang of supportedLanguages) {
        for (const targetLang of supportedLanguages) {
          if (sourceLang !== targetLang) {
            // Check if already cached
            const cached = this.getTranslation(phrase, sourceLang, targetLang);
            if (!cached) {
              // In a real implementation, you would translate here
              // For now, we'll just log that we would warm up
              logger.debug('Would warm up cache entry', {
                phrase: phrase.substring(0, 30) + '...',
                sourceLang,
                targetLang
              });
              warmedCount++;
            }
          }
        }
      }
    }

    logger.info('Cache warm-up completed', {
      potentialEntries: warmedCount
    });
  }
}

export default new CacheService();