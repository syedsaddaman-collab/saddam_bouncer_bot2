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
const os = require('os'); // 🔥 Naya add kiya system check ke liye

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// 🔥 ZIP FILE FIX (Error ENOENT hamesha ke liye khatam)
const zipPath = './RemoteAuth-saddam_bot.zip';
if (!fs.existsSync(zipPath)) {
    const emptyZip = Buffer.from('UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==', 'base64');
    fs.writeFileSync(zipPath, emptyZip);
}

// 🔥 SMART CHROME FINDER (Local PC aur Cloud dono ke liye)
let chromePath = undefined;
if (os.platform() === 'win32') {
    const paths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    chromePath = paths.find(p => fs.existsSync(p));
}

const TELEGRAM_TOKEN = '8833572264:AAHXOxhvIFzuO9BY2pqdnZ-txCBR4G0M-IQ';
const MY_CHAT_ID = '7680270295';
const GROQ_API_KEY = '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';
const MONGODB_URI = 'mongodb+srv://syedsaddaman_db_user:2815Sss%40@cluster0.vrgnii8.mongodb.net/?appName=Cluster0';

const tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: { interval: 2000, autoStart: true } });
const groq = new Groq({ apiKey: GROQ_API_KEY });
const chatSessions = {}; 

// --- Telegram Button Function ---
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

// --- Telegram Callback Handler ---
tgBot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data; 

    if (data.startsWith('human_')) {
        const userId = data.split('human_')[1];
        if (chatSessions[userId]) chatSessions[userId].human_mode = true;
        await tgBot.sendMessage(chatId, "✅ Theek hai, ab aap baat kijiye. Bot is user ke liye ruk gaya hai.");
    } else if (data.startsWith('bot_')) {
        const userId = data.split('bot_')[1];
        if (chatSessions[userId]) chatSessions[userId].human_mode = false;
        await tgBot.sendMessage(chatId, "🤖 Theek hai, bot hi handle kar raha hai.");
    }
    await tgBot.answerCallbackQuery(query.id);
});

mongoose.connect(MONGODB_URI).then(() => {
    console.log('✅ MongoDB Connected!');
    const store = new MongoStore({ mongoose: mongoose });
    
    // Puppeteer ki settings
    const puppeteerOptions = {
        puppeteer: puppeteer,
        handleSIGINT: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    };
    // Agar Windows mein Chrome mil gaya, toh uska rasta de do
    if (chromePath) {
        puppeteerOptions.executablePath = chromePath;
    }
    
    const client = new Client({
        authStrategy: new RemoteAuth({ 
            clientId: 'saddam_bot', 
            store: store,
            backupSyncIntervalMs: 60000,
            dataPath: './.wwebjs_auth' 
        }),
        puppeteer: puppeteerOptions // 🔥 Y
