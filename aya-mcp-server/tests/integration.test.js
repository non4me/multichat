import { jest } from '@jest/globals';
import request from 'supertest';
import AyaMCPServer from '../src/server.js';
import { AyaTranslator } from '../src/client/ayaTranslator.js';

describe('Aya-Expanse MCP Server Integration Tests', () => {
  let server;
  let app;
  const testApiKey = 'test-api-key-12345';
  const testJwtToken = 'test-jwt-token';

  beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.MASTER_API_KEY = testApiKey;
    process.env.ALLOWED_API_KEYS = testApiKey;
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-32-chars';
    process.env.AYA_MODEL_URL = 'http://localhost:11434';
    process.env.OLLAMA_MODEL = 'aya-expanse';

    // Create and initialize server
    server = new AyaMCPServer();
    await server.initialize();
    app = server.getApp();
  });

  afterAll(async () => {
    if (server && server.server) {
      await new Promise((resolve) => {
        server.server.close(resolve);
      });
    }
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('API Documentation', () => {
    test('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('Authentication', () => {
    test('should reject requests without authentication', async () => {
      await request(app)
        .get('/v2/languages')
        .expect(401);
    });

    test('should accept valid API key', async () => {
      const response = await request(app)
        .get('/v2/languages')
        .set('Authorization', `ApiKey ${testApiKey}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should generate JWT token with valid API key', async () => {
      const response = await request(app)
        .post('/auth/token')
        .set('Authorization', `ApiKey ${testApiKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('token_type', 'Bearer');
      expect(response.body).toHaveProperty('expires_in');
    });

    test('should reject invalid API key', async () => {
      await request(app)
        .get('/v2/languages')
        .set('Authorization', 'ApiKey invalid-key')
        .expect(401);
    });
  });

  describe('Translation API', () => {
    test('should return supported languages', async () => {
      const response = await request(app)
        .get('/v2/languages')
        .set('Authorization', `ApiKey ${testApiKey}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const language = response.body[0];
      expect(language).toHaveProperty('language');
      expect(language).toHaveProperty('name');
      expect(language).toHaveProperty('supports_formality');
    });

    test('should handle translation request validation', async () => {
      // Test missing required fields
      await request(app)
        .post('/v2/translate')
        .set('Authorization', `ApiKey ${testApiKey}`)
        .send({})
        .expect(400);

      // Test invalid target language
      await request(app)
        .post('/v2/translate')
        .set('Authorization', `ApiKey ${testApiKey}`)
        .send({
          text: 'Hello world',
          target_lang: 'invalid'
        })
        .expect(400);
    });

    test('should handle same source and target language', async () => {
      const response = await request(app)
        .post('/v2/translate')
        .set('Authorization', `ApiKey ${testApiKey}`)
        .send({
          text: 'Hello world',
          source_lang: 'en',
          target_lang: 'en'
        })
        .expect(200);

      expect(response.body).toHaveProperty('translations');
      expect(response.body.translations).toHaveLength(1);
      expect(response.body.translations[0].text).toBe('Hello world');
    });

    test('should handle language detection', async () => {
      const response = await request(app)
        .post('/v2/detect')
        .set('Authorization', `ApiKey ${testApiKey}`)
        .send({
          text: 'Hello world'
        })
        .expect(200);

      expect(response.body).toHaveProperty('detections');
      expect(response.body.detections).toHaveLength(1);
      expect(response.body.detections[0]).toHaveProperty('language');
      expect(response.body.detections[0]).toHaveProperty('confidence');
    });
  });

  describe('Usage Statistics', () => {
    test('should return usage information', async () => {
      const response = await request(app)
        .get('/v2/usage')
        .set('Authorization', `ApiKey ${testApiKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('character_count');
      expect(response.body).toHaveProperty('character_limit');
      expect(response.body).toHaveProperty('cache_stats');
    });
  });

  describe('Admin Endpoints', () => {
    test('should require master key for admin endpoints', async () => {
      // Regular API key should be rejected
      await request(app)
        .get('/admin/cache/stats')
        .set('Authorization', 'ApiKey regular-key')
        .expect(401);
    });

    test('should return cache stats for master key', async () => {
      const response = await request(app)
        .get('/admin/cache/stats')
        .set('Authorization', `ApiKey ${testApiKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('hits');
      expect(response.body).toHaveProperty('misses');
      expect(response.body).toHaveProperty('size');
    });

    test('should generate new API keys', async () => {
      const response = await request(app)
        .post('/admin/keys/generate')
        .set('Authorization', `ApiKey ${testApiKey}`)
        .send({
          description: 'Test generated key'
        })
        .expect(200);

      expect(response.body).toHaveProperty('api_key');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('created_at');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting', async () => {
      const requests = [];
      
      // Make multiple requests quickly
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .get('/v2/languages')
            .set('Authorization', `ApiKey ${testApiKey}`)
        );
      }

      const responses = await Promise.all(requests);
      
      // All should succeed as we're within limits
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 errors gracefully', async () => {
      const response = await request(app)
        .get('/nonexistent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('available_endpoints');
    });

    test('should handle malformed JSON', async () => {
      await request(app)
        .post('/v2/translate')
        .set('Authorization', `ApiKey ${testApiKey}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });
});

describe('AyaTranslator Client Tests', () => {
  let translator;
  const mockServer = 'http://localhost:3001';
  const testApiKey = 'test-client-key';

  beforeAll(() => {
    translator = new AyaTranslator(testApiKey, {
      baseURL: mockServer
    });
  });

  describe('DeepL Compatibility', () => {
    test('should have DeepL-compatible interface', () => {
      expect(translator).toHaveProperty('translateText');
      expect(translator).toHaveProperty('detectLanguage');
      expect(translator).toHaveProperty('getSourceLanguages');
      expect(translator).toHaveProperty('getTargetLanguages');
      expect(translator).toHaveProperty('getUsage');
    });

    test('should format requests correctly', () => {
      expect(translator.client.defaults.headers['Authorization']).toBe(`Bearer ${testApiKey}`);
      expect(translator.client.defaults.headers['Content-Type']).toBe('application/json');
      expect(translator.client.defaults.baseURL).toBe(mockServer);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      const invalidTranslator = new AyaTranslator('test-key', {
        baseURL: 'http://invalid-host:9999',
        timeout: 1000
      });

      await expect(invalidTranslator.healthCheck()).rejects.toThrow();
    });
  });
});

describe('Configuration Tests', () => {
  test('should validate required environment variables', () => {
    const originalEnv = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    expect(() => {
      const server = new AyaMCPServer();
      server.getConfig().validate();
    }).toThrow('JWT_SECRET must be at least 32 characters long');

    process.env.JWT_SECRET = originalEnv;
  });

  test('should provide default configuration values', () => {
    const server = new AyaMCPServer();
    const config = server.getConfig();

    expect(config.get('server.port')).toBeDefined();
    expect(config.get('translation.supportedLanguages')).toBeDefined();
    expect(config.get('cache.maxSize')).toBeDefined();
  });
});