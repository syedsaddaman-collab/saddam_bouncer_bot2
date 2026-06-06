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

// 🔥 ZIP FILE FIX 
const authPath = './.wwebjs_auth';
if (!fs.existsSync(authPath)) {
    fs.mkdirSync(authPath, { recursive: true });
}
const zipPath = `${authPath}/RemoteAuth-saddam_bot.zip`;
if (!fs.existsSync(zipPath)) {
    const emptyZip = Buffer.from('UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==', 'base64');
    fs.writeFileSync(zipPath, emptyZip);
}

// 🔥 Keys
const TELEGRAM_TOKEN = '8849454247:AAHr5IgTjG04tpv2KgxqmUvL-tubdf4KcQo';
const MY_CHAT_ID = '7680270295';
const GROQ_API_KEY = 'gsk_fDI48J4idyApaUFYOUr0WGdyb3FY0nU0KAZMheqdaPNPkH8oZctU';
const MONGODB_URI = 'mongodb+srv://syedsaddaman_db_user:2815Sss%40@cluster0.vrgnii8.mongodb.net/?appName=Cluster0';

const tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const groq = new Groq({ apiKey: GROQ_API_KEY });
const chatSessions = {}; 

// 🔥 TELEGRAM ERROR FILTER (Spam band karne ke liye)
tgBot.on('polling_error', (error) => {
    if(error.message.includes('409 Conflict')) {
        // Ignore
    } else {
        console.log('Telegram Error:', error.message);
    }
});

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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    };
    
    const client = new Client({
        authStrategy: new RemoteAuth({ 
            clientId: 'saddam_bot', 
            store: store, 
            backupSyncIntervalMs: 60000, 
            dataPath: './.wwebjs_auth' 
        }),
        puppeteer: puppeteerOptions,
        authTimeoutMs: 300000 
    });

    let qrSent = false;
    client.on('qr', async (qr) => {
        if (!qrSent) {
            console.log('\nNaya QR Code Aaya Hai!');
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
            await tgBot.sendPhoto(MY_CHAT_ID, qrImageUrl, { caption: "📱 Bhai, ye raha QR Code! (Sirf ek baar aayega)" })
                .catch(e => console.log('Telegram Photo Error:', e.message));
            qrSent = true;
        }
    });

    client.on('ready', () => {
        console.log('\n✅ Bot Ready!');
        tgBot.sendMessage(MY_CHAT_ID, '✅ Syed_Saddam_Hussain_Bouncer is Online and Active!');
    });

    // 🔥 MAIN MESSAGE LOGIC (Voice Note + AI)
    client.on('message', async (msg) => {
        if (msg.fromMe || msg.isStatus) return; // Khud ke messages ko ignore karega
        
        const userId = msg.from;
        const contact = await msg.getContact();
        const contactName = contact.pushname || "Unknown";

        if (!chatSessions[userId]) chatSessions[userId] = { interacted: false, human_mode: false };

        // Telegram par message aur buttons bhejega
        const messageType = msg.hasMedia ? 'Media/Audio' : msg.body;
        await tgBot.sendMessage(MY_CHAT_ID, `📩 *Naya Message Aaya!*\n👤 *Banda:* ${contactName}\n💬 *Message:* ${messageType}`, { parse_mode: "Markdown" });
        await sendControlButtons(MY_CHAT_ID, userId);

        // 🔥 Pehli baar interaction (Recording bhejega)
        if (!chatSessions[userId].interacted) {
            try {
                // Aapke GitHub me 'assistant.ogg' ya 'assistant.mp3' file honi chahiye
                let audioFile = fs.existsSync('./assistant.ogg') ? './assistant.ogg' : (fs.existsSync('./assistant.mp3') ? './assistant.mp3' : null);
                
                if (audioFile) {
                    const voiceNote = MessageMedia.fromFilePath(audioFile);
                    await client.sendMessage(userId, voiceNote, { sendAudioAsVoice: true });
                    await tgBot.sendMessage(MY_CHAT_ID, `🤖 *Bot Action:* Maine voice recording bhej di hai. Ab aage text chat hogi.`, { parse_mode: "Markdown" });
                } else {
                    await msg.reply(`Assalamu alaikum ${contactName}, mai Syed Saddam Hussain ki Bouncer assistant hoon. Bataye aapko kya kaam hai unse?`);
                }
            } catch (e) { 
                console.error("Voice Note Error:", e); 
            }
            
            chatSessions[userId].interacted = true;
            return; 
        }

        // Agar aapne "Main Baat Karunga" dabaya hai, toh bot chup rahega
        if (chatSessions[userId].human_mode) return;

        // 🔥 AI Bot Handling
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
