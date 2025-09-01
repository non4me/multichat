import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Service for interacting with aya-expanse model
 */
class AyaService {
  constructor() {
    this.config = config.get('aya');
    this.client = this.createHttpClient();
  }

  createHttpClient() {
    const client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    // Add request/response interceptors for logging
    client.interceptors.request.use(
      (config) => {
        logger.debug('Aya API request', {
          url: config.url,
          method: config.method,
          headers: config.headers
        });
        return config;
      },
      (error) => {
        logger.error('Aya API request error', error);
        return Promise.reject(error);
      }
    );

    client.interceptors.response.use(
      (response) => {
        logger.debug('Aya API response', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        logger.error('Aya API response error', error, {
          url: error.config?.url,
          status: error.response?.status
        });
        return Promise.reject(error);
      }
    );

    return client;
  }

  /**
   * Generate text using aya-expanse model
   */
  async generateText(prompt, options = {}) {
    const startTime = Date.now();
    
    try {
      const requestData = {
        model: this.config.modelName,
        prompt,
        options: {
          temperature: options.temperature || this.config.temperature,
          top_p: options.topP || this.config.topP,
          max_tokens: options.maxTokens || this.config.maxTokens,
          stop: options.stop || null
        },
        stream: false
      };

      const response = await this.client.post('/api/generate', requestData);
      const duration = Date.now() - startTime;
      
      if (response.data && response.data.response) {
        const generatedText = response.data.response.trim();
        
        logger.logModelInteraction(
          this.config.modelName,
          prompt,
          generatedText,
          duration,
          response.data.eval_count || null
        );

        return {
          text: generatedText,
          usage: {
            promptTokens: response.data.prompt_eval_count || 0,
            completionTokens: response.data.eval_count || 0,
            totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
          },
          model: this.config.modelName,
          duration
        };
      }

      throw new Error('Invalid response format from aya-expanse model');
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to generate text with aya-expanse', error, {
        model: this.config.modelName,
        promptLength: prompt.length,
        duration
      });
      
      throw new Error(`Aya-expanse generation failed: ${error.message}`);
    }
  }

  /**
   * Translate text using aya-expanse
   */
  async translateText(text, sourceLanguage, targetLanguage, context = 'chat') {
    const promptConfig = config.getTranslationPrompt(sourceLanguage, targetLanguage, context);
    
    const prompt = this.buildTranslationPrompt(
      promptConfig.system,
      promptConfig.instruction,
      promptConfig.context,
      text
    );

    const result = await this.generateText(prompt, {
      temperature: 0.1, // Lower temperature for more consistent translations
      maxTokens: Math.min(text.length * 2, this.config.maxTokens)
    });

    return {
      text: result.text,
      sourceLanguage,
      targetLanguage,
      usage: result.usage,
      duration: result.duration
    };
  }

  /**
   * Detect language of the text
   */
  async detectLanguage(text) {
    const promptConfig = config.getLanguageDetectionPrompt();
    
    const prompt = this.buildLanguageDetectionPrompt(
      promptConfig.system,
      promptConfig.instruction,
      text
    );

    const result = await this.generateText(prompt, {
      temperature: 0.0, // Very low temperature for consistent detection
      maxTokens: 10 // We only need a language code
    });

    // Extract language code from response
    const detectedLanguage = result.text.toLowerCase().trim();
    
    // Validate detected language
    const supportedLanguages = config.get('translation.supportedLanguages');
    if (supportedLanguages.includes(detectedLanguage)) {
      return detectedLanguage;
    }

    // Fallback to English if detection fails
    logger.warn('Language detection returned unsupported language', {
      detectedLanguage,
      text: text.substring(0, 100),
      fallback: 'en'
    });
    
    return 'en';
  }

  /**
   * Translate multiple texts in batch
   */
  async batchTranslate(texts, sourceLanguage, targetLanguage, context = 'chat') {
    const batchSize = config.get('translation.batchSize');
    const results = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => 
        this.translateText(text, sourceLanguage, targetLanguage, context)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Build translation prompt
   */
  buildTranslationPrompt(systemPrompt, instruction, contextHint, text) {
    return `${systemPrompt}

${instruction}

${contextHint}

Text to translate:
"""
${text}
"""

Translation:`;
  }

  /**
   * Build language detection prompt
   */
  buildLanguageDetectionPrompt(systemPrompt, instruction, text) {
    return `${systemPrompt}

${instruction}

Text to analyze:
"""
${text}
"""

Language code:`;
  }

  /**
   * Check if the service is healthy
   */
  async healthCheck() {
    try {
      const testPrompt = "Hello";
      const result = await this.generateText(testPrompt, {
        maxTokens: 10,
        temperature: 0.0
      });
      
      return {
        healthy: true,
        model: this.config.modelName,
        responseTime: result.duration
      };
    } catch (error) {
      logger.error('Aya service health check failed', error);
      return {
        healthy: false,
        model: this.config.modelName,
        error: error.message
      };
    }
  }
}

export default new AyaService();