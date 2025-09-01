import axios from 'axios';

/**
 * DeepL-compatible client for Aya-Expanse MCP Server
 * Drop-in replacement for deepl-node library
 */
class AyaTranslator {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseURL = options.baseURL || 'http://localhost:3001';
    this.timeout = options.timeout || 30000;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          // Convert to DeepL-like error format
          const deeplError = new Error(error.response.data.message || 'Translation failed');
          deeplError.statusCode = error.response.status;
          deeplError.response = error.response.data;
          throw deeplError;
        }
        throw error;
      }
    );
  }

  /**
   * Translate text (DeepL-compatible method)
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code (or null for auto-detection)
   * @param {string} targetLanguage - Target language code
   * @param {Object} options - Translation options
   */
  async translateText(text, sourceLanguage, targetLanguage, options = {}) {
    try {
      const requestData = {
        text: text,
        source_lang: sourceLanguage || 'auto',
        target_lang: targetLanguage,
        context: options.context || 'chat',
        preserve_formatting: options.preserve_formatting || false,
        formality: options.formality || 'default'
      };

      const response = await this.client.post('/v2/translate', requestData);
      
      if (!response.data.translations || response.data.translations.length === 0) {
        throw new Error('No translation received');
      }

      const translation = response.data.translations[0];
      
      // Return DeepL-compatible response object
      return {
        text: translation.text,
        detectedSourceLang: translation.detected_source_language,
        billingCharacters: text.length // Approximate billing
      };

    } catch (error) {
      throw this.handleError(error, 'translateText');
    }
  }

  /**
   * Translate multiple texts (batch translation)
   * @param {string[]} texts - Array of texts to translate
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @param {Object} options - Translation options
   */
  async translateTexts(texts, sourceLanguage, targetLanguage, options = {}) {
    try {
      const requestData = {
        text: texts,
        source_lang: sourceLanguage || 'auto',
        target_lang: targetLanguage,
        context: options.context || 'chat'
      };

      const response = await this.client.post('/v2/translate', requestData);
      
      if (!response.data.translations) {
        throw new Error('No translations received');
      }

      // Return DeepL-compatible response objects
      return response.data.translations.map((translation, index) => ({
        text: translation.text,
        detectedSourceLang: translation.detected_source_language,
        billingCharacters: texts[index].length
      }));

    } catch (error) {
      throw this.handleError(error, 'translateTexts');
    }
  }

  /**
   * Detect language of text
   * @param {string} text - Text to analyze
   */
  async detectLanguage(text) {
    try {
      const response = await this.client.post('/v2/detect', { text });
      
      if (!response.data.detections || response.data.detections.length === 0) {
        throw new Error('No language detection result');
      }

      const detection = response.data.detections[0];
      
      return {
        language: detection.language,
        confidence: detection.confidence
      };

    } catch (error) {
      throw this.handleError(error, 'detectLanguage');
    }
  }

  /**
   * Get supported languages
   * @param {string} type - 'source' or 'target'
   */
  async getSourceLanguages() {
    return this.getLanguages('source');
  }

  async getTargetLanguages() {
    return this.getLanguages('target');
  }

  async getLanguages(type = null) {
    try {
      const params = type ? { type } : {};
      const response = await this.client.get('/v2/languages', { params });
      
      return response.data.map(lang => ({
        code: lang.language,
        name: lang.name,
        supportsFormality: lang.supports_formality
      }));

    } catch (error) {
      throw this.handleError(error, 'getLanguages');
    }
  }

  /**
   * Get usage statistics
   */
  async getUsage() {
    try {
      const response = await this.client.get('/v2/usage');
      
      return {
        characterCount: response.data.character_count,
        characterLimit: response.data.character_limit
      };

    } catch (error) {
      throw this.handleError(error, 'getUsage');
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'healthCheck');
    }
  }

  /**
   * Handle and convert errors to DeepL-compatible format
   */
  handleError(error, operation) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      // Convert to DeepL-like error codes
      let deeplError;
      
      switch (status) {
        case 400:
          deeplError = new Error(`Bad request: ${data.message}`);
          deeplError.code = 'BAD_REQUEST';
          break;
        case 401:
          deeplError = new Error('Authentication failed: Invalid API key');
          deeplError.code = 'UNAUTHORIZED';
          break;
        case 403:
          deeplError = new Error('Forbidden: Insufficient permissions');
          deeplError.code = 'FORBIDDEN';
          break;
        case 429:
          deeplError = new Error('Too many requests: Rate limit exceeded');
          deeplError.code = 'TOO_MANY_REQUESTS';
          break;
        case 456:
          deeplError = new Error('Quota exceeded: Character limit reached');
          deeplError.code = 'QUOTA_EXCEEDED';
          break;
        case 500:
          deeplError = new Error('Internal server error');
          deeplError.code = 'INTERNAL_ERROR';
          break;
        case 503:
          deeplError = new Error('Service unavailable');
          deeplError.code = 'SERVICE_UNAVAILABLE';
          break;
        default:
          deeplError = new Error(`HTTP ${status}: ${data.message || 'Unknown error'}`);
          deeplError.code = 'HTTP_ERROR';
      }
      
      deeplError.statusCode = status;
      deeplError.operation = operation;
      deeplError.originalError = error;
      
      return deeplError;
    }
    
    // Network or other errors
    const networkError = new Error(`Network error in ${operation}: ${error.message}`);
    networkError.code = 'NETWORK_ERROR';
    networkError.operation = operation;
    networkError.originalError = error;
    
    return networkError;
  }
}

/**
 * Factory function to create translator instance (DeepL-compatible)
 */
export function createTranslator(apiKey, options = {}) {
  return new AyaTranslator(apiKey, options);
}

export default AyaTranslator;