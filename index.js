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

const authPath = './.wwebjs_auth';
if (!fs.existsSync(authPath)) {
    fs.mkdirSync(authPath, { recursive: true });
}

let chromePath = undefined;
if (os.platform() === 'win32') {
    const paths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    chromePath = paths.find(p => fs.existsSync(p));
}

// 🔥 Yahan aapki keys fit kar di hain
const TELEGRAM_TOKEN = '8849454247:AAGCRTs-lGN7vBpDP_M2hMGdhRDnl2CghmM';
const MY_CHAT_ID = '7680270295';
const GROQ_API_KEY = 'gsk_fDI48J4idyApaUFYOUr0WGdyb3FY0nU0KAZMheqdaPNPkH8oZctU';
const MONGODB_URI = 'mongodb+srv://syedsaddaman_db_user:2815Sss%40@cluster0.vrgnii8.mongodb.net/?appName=Cluster0';

const tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: { interval: 2000, autoStart: true } });
const groq = new Groq({ apiKey: GROQ_API_KEY });
const chatSessions = {}; 

async function sendControlButtons(chatId, userId) {
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "✅ Main Baat Karunga", callback_data: `human_${userId}` },
                 { text: "🤖 Bot Ko Bolne Do", callback_data: `bot_${userId}` }]
            ]
        }
    };
    await tgBot.sendMessage(chatId, "Aap kya chahte hain?", opts);
}

tgBot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data; 

    if (data.startsWith('human_')) {
        const userId = data.split('human_')[1];
        if (chatSessions[userId]) chatSessions[userId].human_mode = true;
        await tgBot.sendMessage(chatId, "✅ Theek hai, ab aap baat kijiye.");
    } else if (data.startsWith('bot_')) {
        const userId = data.split('bot_')[1];
        if (chatSessions[userId]) chatSessions[userId].human_mode = false;
        await tgBot.sendMessage(chatId, "🤖 Theek hai, bot handle kar raha hai.");
    }
    await tgBot.answerCallbackQuery(query.id);
});

mongoose.connect(MONGODB_URI).then(() => {
    console.log('✅ MongoDB Connected!');
    const store = new MongoStore({ mongoose: mongoose });
    
    const puppeteerOptions = {
        puppeteer: puppeteer,
        handleSIGINT: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-first-run', '--no-zygote']
    };
    if (chromePath) puppeteerOptions.executablePath = chromePath;
    
    const client = new Client({
        authStrategy: new RemoteAuth({ clientId: 'saddam_bot', store: store, backupSyncIntervalMs: 60000, dataPath: './.wwebjs_auth' }),
        puppeteer: puppeteerOptions,
        authTimeoutMs: 300000
    });

    client.on('qr', async (qr) => {
        console.log('\nNaya QR Code Aaya Hai! Telegram check karo...');
        try {
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
            await tgBot.sendPhoto(MY_CHAT_ID, qrImageUrl, { caption: "📱 Bhai, ye raha perfect QR Code! Isko turant scan kar lo." });
        } catch (e) { console.log('Telegram QR Error:', e.message); }
    });

    client.on('ready', () => {
        console.log('\n✅ Bot Ready!');
        tgBot.sendMessage(MY_CHAT_ID, '✅ Syed_Saddam_Hussain_Bouncer is Online!');
    });

    client.on('message', async (msg) => {
        if (msg.fromMe || msg.isStatus) return;
        const userId = msg.from;
        const contact = await msg.getContact();
        const contactName = contact.pushname || "Unknown";

        if (!chatSessions[userId]) chatSessions[userId] = { interacted: false, human_mode: false };

        await tgBot.sendMessage(MY_CHAT_ID, `📩 Message from ${contactName}: ${msg.body}`);
        await sendControlButtons(MY_CHAT_ID, userId);

        if (!chatSessions[userId].interacted) {
            await msg.reply(`Assalamu alaikum ${contactName}, mai Saddam ki assistant hoon.`);
            chatSessions[userId].interacted = true;
            return;
        }
        if (chatSessions[userId].human_mode) return;

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: "system", content: "You are a female Bouncer AI assistant for Syed Saddam Hussain." }, { role: "user", content: msg.body }],
                model: "llama-3.1-8b-instant"
            });
            const aiReply = chatCompletion.choices[0].message.content;
            await msg.reply(aiReply);
            await tgBot.sendMessage(MY_CHAT_ID, `🤖 Bot Reply:\n${aiReply}`);
        } catch (err) { console.error("AI Error:", err); }
    });

    client.initialize();
});
