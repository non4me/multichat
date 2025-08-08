require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const cors = require('cors');
const deepl = require('deepl-node');
const crypto = require('crypto');
const LRU = require('lru-cache');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {origin: 'http://localhost:4200', methods: ['GET', 'POST']}
});

app.use(cors());
app.use(express.json());

const serviceAccount = require('./firebase.json');
admin.initializeApp({credential: admin.credential.cert(serviceAccount)});

const translator = new deepl.Translator(process.env.DEEPL_API_KEY);
const connections = new Set();
const getUserInfo = (socketUser) => {
    const {name, email, provider_id, user_id} = socketUser;

    return name ? `${name}: (${email})` : `${provider_id}: ${user_id}`;
}
const cacheTranslation = new LRU({
  max: 1000,
  ttl: 1000 * 60 * 60 * 24, // 24h
  allowStale: true
});

function getLocaleIdentifier(lang) {
    return lang === 'en' ? 'en-GB' : lang;
}

function makeCacheKey(text, from, to) {
  const hash = crypto.createHash('sha1').update(text).digest('hex');
  return `${from}:${to}:${hash}`;
}

function translateMessage(originalMessage, sender) {
  return async (socket) => {
    const fromLang = originalMessage.sourceLang;
    const toLang = socket.user.lang;
    let translated;

    if (fromLang === toLang) {
      translated = originalMessage.text;
    } else {
      const key = makeCacheKey(originalMessage.text, fromLang, toLang);
      const cached = cacheTranslation.get(key);

      if (cached) {
        translated = cached;
        // console.log(`Cache hit: ${key}`);
      } else {
        console.log(`Cache miss: ${key}`);
        const res = await translator.translateText(
          originalMessage.text,
          fromLang,
          getLocaleIdentifier(toLang)
        );
        translated = res.text;
        cacheTranslation.set(key, translated);
      }
    }

    socket.emit('message', {
      ...originalMessage,
      userName: getUserInfo(sender),
      text: translated
    });
  };
}

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) return next(new Error('Authentication error'));

    try {
        socket.user = await admin.auth().verifyIdToken(token);
        next();
    } catch (error) {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    connections.add(socket);

    console.log(`User connected: ${getUserInfo(socket.user)}`);

    socket.on('language', (data) => {
        console.log(`For ${getUserInfo(socket.user)} set language: ${data}`);
        socket.user.lang = data;
    });

    socket.on('message', async (message) => {
        await Promise.all([...connections].map(s => translateMessage(message, socket.user)(s)));
    });

    socket.on('disconnect', () => {
        connections.delete(socket);
        console.log(`User disconnected: ${getUserInfo(socket.user)}`);
    });
});

server.listen(3000, () => console.log('Server running on port 3000'));