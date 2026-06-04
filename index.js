const http = require('http');
const port = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write('Saddam Bot is Alive!');
    res.end();
}).listen(port, () => {
    console.log(`✅ Web server is running on port ${port} to keep Render happy!`);
});

const { Client, RemoteAuth, MessageMedia } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');
const Groq = require('groq-sdk');
const fs = require('fs');

// --- CONFIGURATION ---
const TELEGRAM_TOKEN = '8833572264:AAHXOxhvIFzuO9BY2pqdnZ-txCBR4G0M-IQ';
const MY_CHAT_ID = '7680270295';
const GROQ_API_KEY = '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';

// 👇 Aapka MongoDB URL 👇
const MONGODB_URI = 'mongodb+srv://syedsaddaman_db_user:2815Sss%40@cluster0.vrgnii8.mongodb.net/?appName=Cluster0';

// Initialize Bots & AI
const tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const groq = new Groq({ apiKey: GROQ_API_KEY });
const chatSessions = {};

console.log('⏳ MongoDB se connect ho raha hai... Kripya wait karein...');

// Connect to MongoDB
mongoose.connect(MONGODB_URI).then(() => {
    console.log('✅ MongoDB Connected! Session safe hai.');
    
    const store = new MongoStore({ mongoose: mongoose });
    
    const client = new Client({
        authStrategy: new RemoteAuth({
            clientId: 'saddam_bot', // 🔥 Isse zip file ka error nahi aayega
            store: store,
            backupSyncIntervalMs: 300000
        }),
        puppeteer: {
            handleSIGINT: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        console.log('\n🔥 Naya QR Code Scan Karein (Sirf Ek Baar):\n');
        qrcode.generate(qr, { small: true });
    });

    client.on('remote_session_saved', () => {
        console.log('💾 WhatsApp Session MongoDB me Save ho gaya! Ab ye kabhi logout nahi hoga.');
    });

    client.on('ready', async () => {
        console.log('\n✅ Bot Ready Hai! (Cloud Pro Mode 🚀)');
        // 🔥 Safety net for Telegram timeout
        try {
            await tgBot.sendMessage(MY_CHAT_ID, 'Bhai, Saddam WA Bouncer (Cloud Pro Mode) active ho gaya hai! Session fully secured in Database.');
        } catch (err) {
            console.log('⚠️ Telegram par Ready message nahi gaya (Network Issue), par Bot successfully chalu hai!');
        }
    });

    client.on('message', async (msg) => {
        if (msg.fromMe || msg.isStatus || msg.from === 'status@broadcast') return;

        const contact = await msg.getContact();
        const senderName = contact.name || contact.pushname || 'Unknown';
        const userId = msg.from;

        if (!chatSessions[userId]) {
            chatSessions[userId] = { state: 'new', history: [] };
        }

        const session = chatSessions[userId];

        try {
            if (session.state !== 'saddam_chatting') {
                let instantAlert = `📥 *Naya Message Aaya!*\n👤 *Banda:* ${senderName}\n💬 *Message:* ${msg.body || '[Media]'}`;
                await tgBot.sendMessage(MY_CHAT_ID, instantAlert, { parse_mode: 'Markdown' });
            } else {
                await tgBot.sendMessage(MY_CHAT_ID, `📥 *Naya Message:* ${msg.body || '[Media]'} (Aapki chat active hai)`);
                return;
            }
        } catch (e) {
            console.log('⚠️ Telegram Alert bhejne me error aaya, par bot apna kaam kar raha hai.');
        }

        // --- CASE A: PEHLA MESSAGE (Audio bhejna) ---
        if (session.state === 'new') {
            try {
                let audioFile = fs.existsSync('./assistant.ogg') ? './assistant.ogg' : (fs.existsSync('./assistant.mp3') ? './assistant.mp3' : null);

                if (audioFile) {
                    const voiceNote = MessageMedia.fromFilePath(audioFile);
                    await client.sendMessage(userId, voiceNote, { sendAudioAsVoice: true });
                    session.state = 'bot_chatting';
                    sendTelegramControlButtons(userId, `🤖 *Bot Action:* Maine voice recording bhej di hai. Ab aage text chat hogi.`);
                } else {
                    throw new Error("File not found");
                }
            } catch (err) {
                await msg.reply("Assalamu alaikum, mai Syed Saddam Hussain ki assistant ho. Bataye aapko kya kaam hai unse?");
                session.state = 'bot_chatting';
            }
            return;
        }

        // --- CASE B: CONTINUOUS CHAT (Groq AI Reply) ---
        if (session.state === 'bot_chatting') {
            try {
                const systemInstruction = `You are a female AI assistant for Syed Saddam Hussain. Speak in absolute natural, casual, and respectful desi Hinglish (e.g., "Ji bilkul", "Aap bataiye kya kaam tha?"). Keep replies very short (1-2 sentences maximum). Strictly avoid robotic English. Your goal is to get their specific reason for talking to Saddam.`;

                let messagesForGroq = [
                    { role: "system", content: systemInstruction },
                    ...session.history,
                    { role: "user", content: msg.body }
                ];

                const chatCompletion = await groq.chat.completions.create({
                    messages: messagesForGroq,
                    model: "llama-3.1-8b-instant", 
                    max_tokens: 150
                });

                const aiResponse = chatCompletion.choices[0].message.content;
                await msg.reply(aiResponse);

                session.history.push({ role: 'user', content: msg.body });
                session.history.push({ role: 'assistant', content: aiResponse });

                if (session.history.length > 10) session.history = session.history.slice(session.history.length - 10);

                await tgBot.sendMessage(MY_CHAT_ID, `🤖 *Bot Ka Reply:*\n${aiResponse}`).catch(()=>console.log("Telegram error muted"));
            } catch (error) {
                console.error('AI Error:', error.message);
            }
        }
    });

    function sendTelegramControlButtons(userId, text) {
        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ Main Baat Karunga', callback_data: `talk_${userId}` }, { text: '🤖 Bot Ko Bolne Do', callback_data: `keepbot_${userId}` }]
                ]
            }
        };
        tgBot.sendMessage(MY_CHAT_ID, text, { parse_mode: 'Markdown', ...opts }).catch(e=>console.log("TG Button Error"));
    }

    tgBot.on('callback_query', (query) => {
        const action = query.data.split('_')[0];
        const userId = query.data.split('_')[1];

        if (!chatSessions[userId]) chatSessions[userId] = { state: 'bot_chatting', history: [] };

        if (action === 'talk') {
            chatSessions[userId].state = 'saddam_chatting';
            tgBot.sendMessage(MY_CHAT_ID, `👍 Done! Ab aap direct chat kijiye.`).catch(e=>e);
        } else if (action === 'keepbot') {
            chatSessions[userId].state = 'bot_chatting';
            tgBot.sendMessage(MY_CHAT_ID, `🤖 Thik hai, bot hi handle kar raha hai.`).catch(e=>e);
        }
    });

    client.initialize();
}).catch(err => { 
    console.error('❌ MongoDB Connection Error:', err);
});
