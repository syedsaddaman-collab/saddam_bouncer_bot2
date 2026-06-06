const http = require('http');
const port = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write('Saddam Bot is Alive!');
    res.end();
}).listen(port);

const { Client, RemoteAuth, MessageMedia } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');
const Groq = require('groq-sdk');
const fs = require('fs');
const os = require('os');

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

process.on('unhandledRejection', error => {
    console.log('🚨 Unhandled Promise Rejection:', error.message || error);
});

// 🔥 Keys yahan fit hain
const TELEGRAM_TOKEN = '8849454247:AAGCRTs-lGN7vBpDP_M2hMGdhRDnl2CghmM';
const MY_CHAT_ID = '7680270295';
const GROQ_API_KEY = 'gsk_fDI48J4idyApaUFYOUr0WGdyb3FY0nU0KAZMheqdaPNPkH8oZctU';
const MONGODB_URI = 'mongodb+srv://syedsaddaman_db_user:2815Sss%40@cluster0.vrgnii8.mongodb.net/?appName=Cluster0';

// 🔥 polling: true yahan conflict khatam karega
const tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const groq = new Groq({ apiKey: GROQ_API_KEY });
const chatSessions = {}; 

// ... (Baaki saara code waisa hi hai, bas mongoose connect niche hai)

mongoose.connect(MONGODB_URI).then(() => {
    console.log('✅ MongoDB Connected!');
    const store = new MongoStore({ mongoose: mongoose });
    
    const puppeteerOptions = {
        puppeteer: puppeteer,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    
    const client = new Client({
        authStrategy: new RemoteAuth({ clientId: 'saddam_bot', store: store, dataPath: './.wwebjs_auth' }),
        puppeteer: puppeteerOptions
    });

    client.on('qr', async (qr) => {
        console.log('\nNaya QR Code Aaya Hai!');
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
        await tgBot.sendPhoto(MY_CHAT_ID, qrImageUrl, { caption: "📱 Scan this QR Code:" }).catch(e => console.log(e));
    });

    client.on('ready', () => {
        console.log('\n✅ Bot Ready!');
        tgBot.sendMessage(MY_CHAT_ID, '✅ Bouncer Bot Online!');
    });

    client.on('message', async (msg) => {
        if (msg.fromMe) return;
        // AI Logic...
        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: msg.body }],
                model: "llama-3.1-8b-instant"
            });
            await msg.reply(chatCompletion.choices[0].message.content);
        } catch (err) { console.error("AI Error:", err); }
    });

    client.initialize();
});
