// Jest setup file
import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-32-character-minimum';
process.env.MASTER_API_KEY = 'test-master-key-123456';
process.env.ALLOWED_API_KEYS = 'test-key-1,test-key-2,test-key-3';
process.env.AYA_MODEL_URL = 'http://localhost:11434';
process.env.OLLAMA_MODEL = 'aya-expanse';
process.env.LOG_LEVEL = 'error'; // Reduce logging noise in tests

// Mock Ollama API responses
global.mockOllamaResponse = {
  model: 'aya-expanse',
  response: 'Mocked translation response',
  eval_count: 10,
  prompt_eval_count: 5,
  done: true
};

// Global test helpers
global.testHelpers = {
  createMockTranslationRequest: (text = 'Hello world', sourceLang = 'en', targetLang = 'ru') => ({
    text,
    source_lang: sourceLang,
    target_lang: targetLang,
    context: 'chat'
  }),

  createMockTranslationResponse: (text = 'Привет мир', sourceLang = 'en') => ({
    translations: [{
      detected_source_language: sourceLang,
      text
    }]
  }),

  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Console suppression for cleaner test output
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error // Keep errors visible
};

// Cleanup function
afterEach(() => {
  jest.clearAllMocks();
});