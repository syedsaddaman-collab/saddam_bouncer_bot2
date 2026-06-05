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

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const TELEGRAM_TOKEN = '8833572264:AAHXOxhvIFzuO9BY2pqdnZ-txCBR4G0M-IQ';
const MY_CHAT_ID = '7680270295';
const GROQ_API_KEY = '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';
const MONGODB_URI = 'mongodb+srv://syedsaddaman_db_user:2815Sss%40@cluster0.vrgnii8.mongodb.net/?appName=Cluster0';

// 🔥 Telegram polling conflict fix
const tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: { interval: 2000, autoStart: true } });
const groq = new Groq({ apiKey: GROQ_API_KEY });
const chatSessions = {}; 

mongoose.connect(MONGODB_URI).then(() => {
    console.log('✅ MongoDB Connected!');
    const store = new MongoStore({ mongoose: mongoose });
    
    const client = new Client({
        authStrategy: new RemoteAuth({ 
            clientId: 'saddam_bot', 
            store: store,
            backupSyncIntervalMs: 60000,
            dataPath: './.wwebjs_auth'
        }),
        puppeteer: {
            puppeteer: puppeteer,
            handleSIGINT: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        }
    });

    client.on('qr', (qr) => qrcode.generate(qr, { small: true }));

    client.on('ready', () => {
        console.log('\n✅ Bot Ready!');
        tgBot.sendMessage(MY_CHAT_ID, '✅ Syed_Saddam_Hussain_Bouncer is Online and Active!');
    });

    client.on('message', async (msg) => {
        if (msg.fromMe || msg.isStatus) return;
        
        const userId = msg.from;
        const contact = await msg.getContact();
        const contactName = contact.pushname || "Friend";

        if (!chatSessions[userId]) {
            try {
                let audioFile = fs.existsSync('./assistant.ogg') ? './assistant.ogg' : './assistant.mp3';
                if (fs.existsSync(audioFile)) {
                    const voiceNote = MessageMedia.fromFilePath(audioFile);
                    await client.sendMessage(userId, voiceNote, { sendAudioAsVoice: true });
                } else {
                    await msg.reply(`Assalamu alaikum ${contactName}, mai Syed Saddam Hussain ki Bouncer assistant hoon. Bataye aapko kya kaam hai unse?`);
                }
            } catch (e) { console.error("Voice Note Error:", e); }
            chatSessions[userId] = true;
        }

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: `You are a female Bouncer AI assistant for Syed Saddam Hussain. The user is ${contactName}. Be casual, respectful, and brief (Hinglish).` }, 
                    { role: "user", content: msg.body }
                ],
                model: "llama-3.1-8b-instant"
            });
            await msg.reply(chatCompletion.choices[0].message.content);
        } catch (err) { console.error("AI Error:", err); }
    });

    client.initialize();
});

tgBot.on('polling_error', (err) => console.log('Telegram Polling Error:', err.message));
