require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const cors = require('cors');
const deepl = require('deepl-node');

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

function getLocaleIdentifier(lang) {
    return lang === 'en' ? 'en-GB' : lang;
}

function translateMessage(originalMessage) {
    return async (socket) => {
        const fromLang = originalMessage.sourceLang;
        const toLang = socket.user.lang;
        const result = fromLang === toLang
            ? {text: originalMessage.text}
            : await translator.translateText(originalMessage.text, fromLang, getLocaleIdentifier(toLang));
        const message = {
            ...originalMessage,
            text: result.text
        };

        socket.emit('message', message);
    }
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
    const getUserInfo = (socketUser) => {
        const {name, email, provider_id, user_id} = socketUser;

        return name ? `${name}: (${email})` : `${provider_id}: ${user_id}`;
    }

    connections.add(socket);

    console.log(`User connected: ${getUserInfo(socket.user)}`);

    socket.on('language', (data) => {
        console.log(`For ${getUserInfo(socket.user)} set language: ${data}`);
        socket.user.lang = data;
    });

    socket.on('message', async (message) => {
        await Promise.all([...connections].map(socket => translateMessage(message)(socket)));
    });

    socket.on('disconnect', () => {
        connections.delete(socket);
        console.log(`User disconnected: ${getUserInfo(socket.user)}`);
    });
});

server.listen(3000, () => console.log('Server running on port 3000'));