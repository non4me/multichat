# Инструкция по замене DeepL на Aya-Expanse MCP Server

Эта инструкция поможет вам заменить DeepL API на локальную модель aya-expanse с помощью созданного MCP сервера.

## 📋 Предварительные требования

### 1. Установка Ollama и aya-expanse модели

```bash
# Установка Ollama (Linux/macOS)
curl -fsSL https://ollama.ai/install.sh | sh

# Установка Ollama (Windows)
# Скачайте установщик с https://ollama.ai/download/windows

# Загрузка модели aya-expanse
ollama pull aya-expanse

# Проверка установки
ollama list
```

### 2. Установка зависимостей Node.js

```bash
# В корневой директории проекта
cd aya-mcp-server
npm install

# В backend директории
cd ../backend
npm install
```

## ⚙️ Настройка

### 1. Конфигурация MCP сервера

```bash
# Скопируйте файл конфигурации
cd aya-mcp-server
cp .env.example .env

# Отредактируйте .env файл
nano .env
```

Пример конфигурации `.env`:
```bash
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Aya-Expanse Model Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=aya-expanse

# JWT Authentication
JWT_SECRET=ваш-супер-секретный-ключ-минимум-32-символа-для-безопасности

# API Keys для клиентов
MASTER_API_KEY=master-ключ-для-администрирования
ALLOWED_API_KEYS=клиент-ключ-1,клиент-ключ-2,клиент-ключ-3

# Cache Configuration
CACHE_TTL=86400

# Logging
LOG_LEVEL=info
LOG_DIR=logs
```

### 2. Конфигурация Backend

```bash
# В директории backend
cd ../backend
cp .env.example .env

# Отредактируйте .env файл
nano .env
```

Пример конфигурации backend `.env`:
```bash
# Aya-Expanse MCP Server
AYA_API_KEY=клиент-ключ-1
AYA_SERVER_URL=http://localhost:3001

# Legacy DeepL (для совместимости/fallback)
DEEPL_API_KEY=ваш_deepl_ключ_если_есть

# Firebase (существующая конфигурация)
# Убедитесь что firebase.json файл присутствует

# Server
PORT=3000
NODE_ENV=development
```

## 🚀 Запуск системы

### 1. Запуск Ollama (если не запущен автоматически)

```bash
# Проверка статуса
ollama ps

# Запуск в фоне (если необходимо)
ollama serve
```

### 2. Запуск Aya-Expanse MCP сервера

```bash
cd aya-mcp-server

# Режим разработки
npm run dev

# ИЛИ продакшн режим
npm start

# ИЛИ с PM2 (рекомендуется)
pm2 start src/server.js --name aya-mcp-server
```

### 3. Запуск основного backend

```bash
cd ../backend

# Обычный запуск
npm start

# ИЛИ с PM2
pm2 start server.js --name chat-backend
```

### 4. Запуск frontend (без изменений)

```bash
cd ../frontend
npm start
```

## ✅ Проверка работы

### 1. Проверка MCP сервера

```bash
# Health check
curl http://localhost:3001/health

# Получение поддерживаемых языков
curl -H "Authorization: ApiKey клиент-ключ-1" \
     http://localhost:3001/v2/languages

# Тестовый перевод
curl -X POST \
     -H "Authorization: ApiKey клиент-ключ-1" \
     -H "Content-Type: application/json" \
     -d '{"text": "Hello world", "source_lang": "en", "target_lang": "ru"}' \
     http://localhost:3001/v2/translate
```

### 2. Проверка интеграции

- Откройте frontend: http://localhost:4200
- Авторизуйтесь через Firebase
- Выберите язык (например, русский)
- Отправьте сообщение на английском
- Убедитесь, что сообщение переводится на русский

### 3. Мониторинг логов

```bash
# Логи MCP сервера
cd aya-mcp-server
tail -f logs/combined.log

# Логи основного сервера
cd ../backend
# Логи будут в консоли или pm2 logs
pm2 logs chat-backend
```

## 🔧 Отладка

### Проблемы с Ollama

```bash
# Проверка статуса Ollama
ollama ps

# Проверка модели
ollama show aya-expanse

# Тестовый запрос к модели
ollama run aya-expanse "Translate 'Hello' to Russian"

# Перезапуск Ollama
sudo systemctl restart ollama  # Linux с systemd
# или
killall ollama && ollama serve  # Ручной перезапуск
```

### Проблемы с аутентификацией

```bash
# Проверка API ключей в конфигурации
cd aya-mcp-server
grep "ALLOWED_API_KEYS\|MASTER_API_KEY" .env

# Генерация нового API ключа
curl -X POST \
     -H "Authorization: ApiKey ваш-master-ключ" \
     -H "Content-Type: application/json" \
     -d '{"description": "New client key"}' \
     http://localhost:3001/admin/keys/generate
```

### Проблемы с переводами

```bash
# Проверка кэша переводов
curl -H "Authorization: ApiKey ваш-master-ключ" \
     http://localhost:3001/admin/cache/stats

# Очистка кэша
curl -X POST \
     -H "Authorization: ApiKey ваш-master-ключ" \
     http://localhost:3001/admin/cache/clear

# Проверка промптов
cat aya-mcp-server/config/prompts.json
```

## 📊 Мониторинг производительности

### Статистика использования

```bash
# Статистика переводов
curl -H "Authorization: ApiKey ваш-ключ" \
     http://localhost:3001/v2/usage

# Админская статистика
curl -H "Authorization: ApiKey ваш-master-ключ" \
     http://localhost:3001/admin/stats

# Статистика кэша
curl -H "Authorization: ApiKey ваш-master-ключ" \
     http://localhost:3001/admin/cache/stats
```

### PM2 мониторинг

```bash
# Статус процессов
pm2 status

# Мониторинг в реальном времени
pm2 monit

# Логи
pm2 logs aya-mcp-server
pm2 logs chat-backend
```

## 🔄 Переключение между DeepL и Aya-Expanse

Код написан таким образом, что можно легко переключаться между DeepL и Aya-Expanse:

### Использовать Aya-Expanse (по умолчанию)
```bash
# В backend/.env
AYA_API_KEY=ваш-aya-ключ
AYA_SERVER_URL=http://localhost:3001
```

### Fallback на DeepL
```bash
# В backend/.env закомментируйте или удалите AYA_API_KEY
# AYA_API_KEY=
DEEPL_API_KEY=ваш-deepl-ключ
```

## 📝 Дополнительные настройки

### Настройка промптов

Отредактируйте файл `aya-mcp-server/config/prompts.json` для улучшения качества переводов:

```json
{
  "translation": {
    "systemPrompt": "Вы профессиональный переводчик...",
    "contextualHints": {
      "chat": "Это неформальное сообщение в чате...",
      "business": "Это деловая переписка..."
    }
  }
}
```

### Настройка кэширования

В `aya-mcp-server/config/default.json`:

```json
{
  "cache": {
    "maxSize": 2000,
    "ttl": 172800000
  }
}
```

### Настройка языков

Добавьте новые языки в `supportedLanguages` в конфигурации и в `languageMapping` в промптах.

## 🚨 Важные заметки

1. **Безопасность**: Используйте сильные API ключи в продакшн
2. **Производительность**: aya-expanse требует больше ресурсов чем DeepL API
3. **Интернет**: Локальная модель работает без интернета (после загрузки)
4. **Качество**: Настройте промпты под ваши специфические задачи
5. **Мониторинг**: Регулярно проверяйте логи и статистику

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи: `aya-mcp-server/logs/combined.log`
2. Убедитесь что Ollama работает: `ollama ps`
3. Проверьте конфигурацию API ключей
4. Протестируйте каждый компонент отдельно
5. Создайте issue в GitHub репозитории