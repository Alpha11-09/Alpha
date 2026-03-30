const { default: makeWASocket, useMultiFileAuthState, Browsers } = require("@whiskeysockets/baileys");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu("Chrome")
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, qr }) => {
    if (qr) {
      console.log("Scan QR in terminal");
    }

    if (connection === "open") {
      console.log("✅ Bot connected!");
    }

    if (connection === "close") {
      console.log("❌ Reconnecting...");
      startBot();
    }
  });

  // 🔥 SIMPLE BOT COMMAND
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg.message) return;

    const text = msg.message.conversation;

    if (text === "hi") {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "👋 Hello from Alpha Bot 💀"
      });
    }
  });
}

startBot();