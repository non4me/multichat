require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const cors = require('cors');
const {Translate} = require('@google-cloud/translate').v2;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {origin: 'http://localhost:4200', methods: ['GET', 'POST']}
});

app.use(cors());
app.use(express.json());

const serviceAccount = require('./firebase.json');
admin.initializeApp({credential: admin.credential.cert(serviceAccount)});

const translate = new Translate({key: process.env.GOOGLE_API_KEY});

app.post('/translate', async (req, res) => {
    const {text, targetLang, sourceLang} = req.body;
    try {
        const [translation] = await translate.translate(text, {from: sourceLang, to: targetLang});
        res.json({translatedText: translation});
    } catch (error) {
        res.status(500).json({error: 'Translation failed'});
    }
});

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        socket.user = decodedToken;
        next();
    } catch (error) {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.email}`);

    socket.on('message', (data) => {
        const message = {
            user: socket.user.email,
            text: data.text,
            sourceLang: data.sourceLang,
            timestamp: new Date()
        };
        io.emit('message', message);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.email}`);
    });
});

server.listen(3000, () => console.log('Server running on port 3000'));