const axios = require('axios');

module.exports = {
    name: "gpt",
    alias: ["ai", "gemini"],

    async execute(sock, message, args) {
        const chatId = message.key.remoteJid;

        if (!args.length) {
            return await sock.sendMessage(chatId, {
                text: "❌ Give me something to respond to.\n\nExample: .gpt Hello bro"
            }, { quoted: message });
        }

        const query = args.join(" ");

        try {
            await sock.sendMessage(chatId, {
                text: "🤖 Thinking..."
            }, { quoted: message });

            const res = await axios.get(
                `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(query)}&owner=Alpha&botname=AlphaBot`
            );

            const reply = res.data.response;

            await sock.sendMessage(chatId, {
                text: `🤖 *AI Response:*\n\n${reply}`
            }, { quoted: message });

        } catch (err) {
            console.error(err);
            await sock.sendMessage(chatId, {
                text: "❌ Failed to get AI response."
            }, { quoted: message });
        }
    }
};