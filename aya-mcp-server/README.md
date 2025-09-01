# Aya-Expanse MCP Translation Server

Полноценный MCP сервер для модели aya-expanse с совместимым DeepL API интерфейсом. Этот сервер позволяет заменить DeepL API на локальную модель aya-expanse без изменения существующего кода.

## 🚀 Возможности

- **DeepL-совместимый API** - Drop-in замена для DeepL API
- **Локальная модель aya-expanse** - Работает без внешних API
- **Аутентификация** - JWT и API key аутентификация
- **Кэширование** - LRU кэш для оптимизации переводов
- **Rate Limiting** - Защита от злоупотреблений
- **Логирование** - Подробное логирование всех операций
- **Мониторинг** - Health checks и статистика
- **Batch переводы** - Поддержка массовых переводов

## 📋 Поддерживаемые языки

- English (en)
- Русский (ru) 
- Deutsch (de)
- Español (es)
- Čeština (cs)
- 中文 (zh)
- Français (fr)
- Italiano (it)
- Português (pt)
- 日本語 (ja)
- 한국어 (ko)
- العربية (ar)
- हिन्दी (hi)
- Türkçe (tr)

## 🛠 Установка

### Предварительные требования

1. **Node.js** >= 18.0.0
2. **Ollama** с установленной моделью aya-expanse:
   ```bash
   ollama pull aya-expanse
   ```

### Установка зависимостей

```bash
cd aya-mcp-server
npm install
```

### Настройка конфигурации

1. Скопируйте файл окружения:
   ```bash
   cp .env.example .env
   ```

2. Отредактируйте `.env` файл:
   ```bash
   # Server Configuration
   NODE_ENV=production
   PORT=3001
   HOST=0.0.0.0
   
   # Aya-Expanse Model Configuration
   OLLAMA_HOST=http://localhost:11434
   OLLAMA_MODEL=aya-expanse
   
   # JWT Authentication
   JWT_SECRET=your-super-secure-jwt-secret-key-here-min-32-chars
   
   # API Keys
   MASTER_API_KEY=your-master-api-key-here
   ALLOWED_API_KEYS=client-key-1,client-key-2,client-key-3
   
   # Cache Configuration
   CACHE_TTL=86400
   
   # Logging
   LOG_LEVEL=info
   ```

## 🚀 Запуск

### Режим разработки
```bash
npm run dev
```

### Продакшн режим
```bash
npm start
```

### С PM2 (рекомендуется для продакшн)
```bash
pm2 start src/server.js --name aya-mcp-server
```

## 📚 API Документация

### Аутентификация

#### API Key аутентификация
```bash
curl -H "Authorization: ApiKey your-api-key" \
     -H "Content-Type: application/json" \
     http://localhost:3001/v2/languages
```

#### JWT токен аутентификация
1. Получите токен:
   ```bash
   curl -X POST \
        -H "Authorization: ApiKey your-api-key" \
        http://localhost:3001/auth/token
   ```

2. Используйте токен:
   ```bash
   curl -H "Authorization: Bearer your-jwt-token" \
        -H "Content-Type: application/json" \
        http://localhost:3001/v2/languages
   ```

### Основные эндпоинты

#### Перевод текста
```bash
curl -X POST \
     -H "Authorization: ApiKey your-api-key" \
     -H "Content-Type: application/json" \
     -d '{
       "text": "Hello, how are you?",
       "source_lang": "en",
       "target_lang": "ru",
       "context": "chat"
     }' \
     http://localhost:3001/v2/translate
```

#### Определение языка
```bash
curl -X POST \
     -H "Authorization: ApiKey your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"text": "Привет, как дела?"}' \
     http://localhost:3001/v2/detect
```

#### Поддерживаемые языки
```bash
curl -H "Authorization: ApiKey your-api-key" \
     http://localhost:3001/v2/languages
```

#### Статистика использования
```bash
curl -H "Authorization: ApiKey your-api-key" \
     http://localhost:3001/v2/usage
```

#### Health check
```bash
curl http://localhost:3001/health
```

## 💻 Использование в коде

### Drop-in замена для deepl-node

```javascript
// Вместо deepl-node
// import * as deepl from 'deepl-node';
// const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

// Используйте aya-translator
import AyaTranslator from './client/ayaTranslator.js';
const translator = new AyaTranslator(process.env.AYA_API_KEY, {
  baseURL: 'http://localhost:3001'
});

// API остается тем же
const result = await translator.translateText(
  'Hello world',
  'en',
  'ru'
);

console.log(result.text); // Привет мир
```

### Пример интеграции с существующим кодом

```javascript
// В вашем backend/server.js замените:

// Старый код:
// const deepl = require('deepl-node');
// const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

// Новый код:
import AyaTranslator from '../aya-mcp-server/src/client/ayaTranslator.js';
const translator = new AyaTranslator(process.env.AYA_API_KEY, {
  baseURL: process.env.AYA_SERVER_URL || 'http://localhost:3001'
});

// API остается полностью совместимым
const res = await translator.translateText(
  originalMessage.text,
  fromLang,
  getLocaleIdentifier(toLang)
);
translated = res.text;
```

## 🔧 Настройки промптов

Промпты для aya-expanse настраиваются в файле `config/prompts.json`:

```json
{
  "translation": {
    "systemPrompt": "You are a professional multilingual translator...",
    "templates": {
      "translate": {
        "instruction": "Translate the following text from {sourceLanguage} to {targetLanguage}..."
      }
    },
    "contextualHints": {
      "chat": "This is a casual chat message. Use informal, conversational tone.",
      "business": "This is business communication. Use professional, formal tone."
    }
  }
}
```

## 📊 Мониторинг и администрирование

### Статистика кэша
```bash
curl -H "Authorization: ApiKey your-master-key" \
     http://localhost:3001/admin/cache/stats
```

### Очистка кэша
```bash
curl -X POST \
     -H "Authorization: ApiKey your-master-key" \
     http://localhost:3001/admin/cache/clear
```

### Генерация API ключей
```bash
curl -X POST \
     -H "Authorization: ApiKey your-master-key" \
     -H "Content-Type: application/json" \
     -d '{"description": "New client key"}' \
     http://localhost:3001/admin/keys/generate
```

### Статистика сервера
```bash
curl -H "Authorization: ApiKey your-master-key" \
     http://localhost:3001/admin/stats
```

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Тест с покрытием
npm run test:coverage

# Интеграционные тесты
npm run test:integration
```

## 📝 Логирование

Логи сохраняются в директории `logs/`:
- `combined.log` - все логи
- `error.log` - только ошибки

Уровни логирования: `error`, `warn`, `info`, `debug`

## 🔒 Безопасность

- JWT токены с истечением срока
- Rate limiting по IP и ключу
- Валидация всех входных данных
- Безопасные заголовки (Helmet.js)
- Хэширование API ключей

## 🚀 Развертывание

### Docker (рекомендуется)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Systemd сервис

```ini
[Unit]
Description=Aya MCP Translation Server
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/opt/aya-mcp-server
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## 🤝 Вклад в развитие

1. Fork репозитория
2. Создайте feature branch
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

## 📄 Лицензия

MIT License - подробности в файле [LICENSE](LICENSE).

## 🆘 Поддержка

- GitHub Issues: [Создать issue](https://github.com/non4me/multichat/issues)
- Документация: [Wiki](https://github.com/non4me/multichat/wiki)
- Email: support@example.com

## 🔄 Обновления

Следите за обновлениями в [CHANGELOG.md](CHANGELOG.md)