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

// 🔥 ZIP FILE FIX 
const zipPath = './RemoteAuth-saddam_bot.zip';
if (!fs.existsSync(zipPath)) {
    const emptyZip = Buffer.from('UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==', 'base64');
    fs.writeFileSync(zipPath, emptyZip);
}

// 🔥 SMART CHROME FINDER 
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
    
    const puppeteerOptions = {
        puppeteer: puppeteer,
        handleSIGINT: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    };
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
        puppeteer: puppeteerOptions 
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
        const contactName = contact.pushname || "Unknown";

        if (!chatSessions[userId]) {
            chatSessions[userId] = { interacted: false, human_mode: false };
        }

        const messageType = msg.hasMedia ? 'Media/Audio' : msg.body;
        const tgMsg = `📩 *Naya Message Aaya!*\n👤 *Banda:* ${contactName}\n💬 *Message:* ${messageType}`;
        await tgBot.sendMessage(MY_CHAT_ID, tgMsg, { parse_mode: "Markdown" });
        await sendControlButtons(MY_CHAT_ID, userId);

        if (!chatSessions[userId].interacted) {
            try {
                let audioFile = fs.existsSync('./assistant.ogg') ? './assistant.ogg' : './assistant.mp3';
                if (fs.existsSync(audioFile)) {
                    const voiceNote = MessageMedia.fromFilePath(audioFile);
                    await client.sendMessage(userId, voiceNote, { sendAudioAsVoice: true });
                } else {
                    await msg.reply(`Assalamu alaikum ${contactName}, mai Syed Saddam Hussain ki Bouncer assistant hoon. Bataye aapko kya kaam hai unse?`);
                }
                await tgBot.sendMessage(MY_CHAT_ID, `🤖 *Bot Action:* Maine voice recording bhej di hai. Ab aage text chat hogi.`, { parse_mode: "Markdown" });
            } catch (e) { console.error("Voice Note Error:", e); }
            
            chatSessions[userId].interacted = true;
            return; 
        }

        if (chatSessions[userId].human_mode) {
            return;
        }

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: `You are a female Bouncer AI assistant for Syed Saddam Hussain. The user is ${contactName}. Be casual, respectful, and brief (Hinglish).` }, 
                    { role: "user", content: msg.body }
                ],
                model: "llama-3.1-8b-instant"
            });
            const aiReply = chatCompletion.choices[0].message.content;
            await msg.reply(aiReply);
            await tgBot.sendMessage(MY_CHAT_ID, `🤖 *Bot Ka Reply:*\n${aiReply}`, { parse_mode: "Markdown" });
        } catch (err) { console.error("AI Error:", err); }
    });

    client.initialize();
});

tgBot.on('polling_error', (err) => console.log('Telegram Polling Error:', err.message));
