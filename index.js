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

if (!fs.existsSync('.wwebjs_auth')) {
    fs.mkdirSync('.wwebjs_auth', { recursive: true });
}
const zipPath = '.wwebjs_auth/RemoteAuth-saddam_bot.zip';
if (!fs.existsSync(zipPath)) {
    const emptyZip = Buffer.from('UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==', 'base64');
    fs.writeFileSync(zipPath, emptyZip);
}

const TELEGRAM_TOKEN = '8833572264:AAHXOxhvIFzuO9BY2pqdnZ-txCBR4G0M-IQ';
const MY_CHAT_ID = '7680270295';
const GROQ_API_KEY = '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';
const MONGODB_URI = 'mongodb+srv://syedsaddaman_db_user:2815Sss%40@cluster0.vrgnii8.mongodb.net/?appName=Cluster0';

// 🔥 TELEGRAM CONFLICT FIX: polling ko smart kiya
const tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: { autoStart: true } });
const groq = new Groq({ apiKey: GROQ_API_KEY });
const chatSessions = {};

console.log('⏳ MongoDB se connect ho raha hai...');

mongoose.connect(MONGODB_URI).then(() => {
    console.log('✅ MongoDB Connected!');
    
    const store = new MongoStore({ mongoose: mongoose });
    
    const client = new Client({
        authStrategy: new RemoteAuth({
            clientId: 'saddam_bot', 
            store: store,
            backupSyncIntervalMs: 300000
        }),
        puppeteer: {
            handleSIGINT: false,
            args: [
                '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote',
                '--single-process', '--disable-gpu'
            ]
        }
    });

    client.on('qr', (qr) => {
        console.log('\n🚨 QR SCAN NA HO TOH: WhatsApp > Link Device > Link with phone number.');
        qrcode.generate(qr, { small: true });
        console.log('\nCopy for manual pairing: ' + qr);
    });

    client.on('remote_session_saved', () => {
        console.log('💾 Session MongoDB me Save ho gaya!');
    });

    client.on('ready', async () => {
        console.log('\n✅ Bot Ready Hai!');
    });

    client.on('message', async (msg) => {
        if (msg.fromMe || msg.isStatus || msg.from === 'status@broadcast') return;
        const userId = msg.from;
        if (!chatSessions[userId]) chatSessions[userId] = { state: 'new', history: [] };
        
        const session = chatSessions[userId];
        
        if (session.state === 'new') {
            try {
                let audioFile = fs.existsSync('./assistant.ogg') ? './assistant.ogg' : './assistant.mp3';
                const voiceNote = MessageMedia.fromFilePath(audioFile);
                await client.sendMessage(userId, voiceNote, { sendAudioAsVoice: true });
                session.state = 'bot_chatting';
            } catch (err) {
                await msg.reply("Assalamu alaikum, mai Syed Saddam Hussain ki assistant ho. Bataye aapko kya kaam hai unse?");
                session.state = 'bot_chatting';
            }
            return;
        }

        if (session.state === 'bot_chatting') {
            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: "system", content: "You are a female AI assistant for Syed Saddam Hussain. Be casual, respectful, and brief (Hinglish)." }, { role: "user", content: msg.body }],
                model: "llama-3.1-8b-instant"
            });
            await msg.reply(chatCompletion.choices[0].message.content);
        }
    });

    client.initialize().catch(err => console.error(err));
}).catch(err => console.error(err));
