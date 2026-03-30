/**
 * Alpha Bot - WhatsApp Bot
 * Copyright (c) 2026 Alpha
 * Licensed under MIT
 */

require('./settings')

const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const axios = require('axios')
const FileType = require('file-type')
const PhoneNumber = require('awesome-phonenumber')
const readline = require("readline")
const pino = require("pino")
const NodeCache = require("node-cache")

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")

const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main')
const { smsg } = require('./lib/myfunc')
const store = require('./lib/lightweight_store')

/* ================= CONFIG ================= */

global.botname = "ALPHA BOT"
global.themeemoji = "⚡"

const settings = require('./settings')
const pairingCode = process.argv.includes("--pairing-code")

/* ================= STORE ================= */

store.readFromFile()
setInterval(() => store.writeToFile(), 10000)

/* ================= MEMORY OPT ================= */

setInterval(() => {
    if (global.gc) {
        global.gc()
        console.log('🧹 Memory cleaned')
    }
}, 60000)

setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 400) {
        console.log('⚠️ High RAM usage, restarting...')
        process.exit(1)
    }
}, 30000)

/* ================= INPUT ================= */

const rl = process.stdin.isTTY
    ? readline.createInterface({ input: process.stdin, output: process.stdout })
    : null

const question = (text) => {
    if (rl) return new Promise(resolve => rl.question(text, resolve))
    return Promise.resolve(settings.ownerNumber)
}

/* ================= MAIN BOT ================= */

async function startAlphaBot() {
    try {
        let { version } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState('./session')

        const msgRetryCounterCache = new NodeCache()

        const AlphaBot = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "1.0.0"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
            },
            markOnlineOnConnect: true,
            syncFullHistory: false,
            msgRetryCounterCache
        })

        store.bind(AlphaBot.ev)
        AlphaBot.ev.on('creds.update', saveCreds)

        /* ================= MESSAGES ================= */

        AlphaBot.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0]
                if (!mek.message) return

                mek.message = mek.message.ephemeralMessage?.message || mek.message

                if (mek.key.remoteJid === 'status@broadcast') {
                    return handleStatus(AlphaBot, chatUpdate)
                }

                await handleMessages(AlphaBot, chatUpdate)

            } catch (err) {
                console.error('Message Error:', err)
            }
        })

        /* ================= CONNECTION ================= */

        AlphaBot.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update

            if (qr) console.log('📱 Scan QR Code')

            if (connection === 'connecting') {
                console.log('🔄 Connecting...')
            }

            if (connection === 'open') {
                console.log(chalk.green(`\n${global.botname} Connected ✅`))

                const botNumber = AlphaBot.user.id.split(':')[0] + '@s.whatsapp.net'

                await AlphaBot.sendMessage(botNumber, {
                    text: `⚡ Alpha Bot is now Online!\n⏰ ${new Date().toLocaleString()}`
                })

                console.log(`
====================================
⚡ BOT: ${global.botname}
⚡ OWNER: ALPHA
⚡ STATUS: ONLINE
====================================
`)
            }

            if (connection === 'close') {
                let reason = lastDisconnect?.error?.output?.statusCode

                if (reason === DisconnectReason.loggedOut) {
                    fs.rmSync('./session', { recursive: true, force: true })
                    console.log('Session cleared, restart bot')
                }

                console.log('Reconnecting...')
                setTimeout(startAlphaBot, 5000)
            }
        })

        /* ================= GROUP ================= */

        AlphaBot.ev.on('group-participants.update', async (data) => {
            await handleGroupParticipantUpdate(AlphaBot, data)
        })

        /* ================= CALL BLOCK ================= */

        AlphaBot.ev.on('call', async (calls) => {
            for (let call of calls) {
                try {
                    await AlphaBot.sendMessage(call.from, {
                        text: '📵 Calls are not allowed. You will be blocked.'
                    })
                    await AlphaBot.updateBlockStatus(call.from, "block")
                } catch {}
            }
        })

        return AlphaBot

    } catch (err) {
        console.error('Startup Error:', err)
        setTimeout(startAlphaBot, 5000)
    }
}

/* ================= START ================= */

startAlphaBot()

/* ================= ERROR HANDLING ================= */

process.on('uncaughtException', err => console.error(err))
process.on('unhandledRejection', err => console.error(err))

/* ================= AUTO RELOAD ================= */

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log('🔄 File Updated')
    delete require.cache[file]
    require(file)
})