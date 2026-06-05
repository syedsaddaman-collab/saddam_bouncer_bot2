client.on('message', async (msg) => {
        if (msg.fromMe || msg.isStatus || msg.from === 'status@broadcast') return;
        
        const userId = msg.from;
        // 🔥 Naya logic: Sender ka naam nikalna
        const contact = await msg.getContact();
        const contactName = contact.pushname || "Unknown User";

        if (!chatSessions[userId]) chatSessions[userId] = { state: 'new', history: [] };
        
        const session = chatSessions[userId];
        
        if (session.state === 'new') {
            try {
                let audioFile = fs.existsSync('./assistant.ogg') ? './assistant.ogg' : './assistant.mp3';
                const voiceNote = MessageMedia.fromFilePath(audioFile);
                await client.sendMessage(userId, voiceNote, { sendAudioAsVoice: true });
                session.state = 'bot_chatting';
            } catch (err) {
                // 🔥 Yahan bhi naam use kiya hai
                await msg.reply(`Assalamu alaikum ${contactName}, mai Syed Saddam Hussain ki assistant hoon. Bataye aapko kya kaam hai unse?`);
                session.state = 'bot_chatting';
            }
            return;
        }

        if (session.state === 'bot_chatting') {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    // 🔥 AI ko bata diya ki samne wala insaan kaun hai
                    { role: "system", content: `You are a female AI assistant for Syed Saddam Hussain. The person you are talking to is ${contactName}. Be casual, respectful, and brief (Hinglish). Respond to them by their name if appropriate.` }, 
                    { role: "user", content: msg.body }
                ],
                model: "llama-3.1-8b-instant"
            });
            await msg.reply(chatCompletion.choices[0].message.content);
        }
    });
