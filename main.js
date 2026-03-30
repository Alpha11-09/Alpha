// ================= TEMP FIX =================
const fs = require('fs')
const path = require('path')

const tempDir = path.join(process.cwd(), 'temp')
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

process.env.TMPDIR = tempDir
process.env.TEMP = tempDir
process.env.TMP = tempDir

setInterval(() => {
    fs.readdir(tempDir, (err, files) => {
        if (err) return
        for (const file of files) {
            const filePath = path.join(tempDir, file)
            fs.stat(filePath, (err, stats) => {
                if (!err && Date.now() - stats.mtimeMs > 3 * 60 * 60 * 1000) {
                    fs.unlink(filePath, () => {})
                }
            })
        }
    })
    console.log('🧹 Temp cleaned')
}, 3 * 60 * 60 * 1000)

// ================= CONFIG =================
const settings = require('./settings')

global.channelLink = "https://whatsapp.com/channel/0029VbCHc4kB4hdVt7JDX10a"
global.groupLink = "https://chat.whatsapp.com/I4DcZPF0400CpnufO838YS?mode=gi_t"
global.ownerName = "Alpha"
global.botName = "Alpha Bot"

// ================= NEWSLETTER =================
const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363423969349257@newsletter',
            newsletterName: 'Alpha Bot ⚡'
        }
    }
}

// ================= IMPORTS =================
const { isBanned } = require('./lib/isBanned')
const isOwner = require('./lib/isOwner')
const isAdmin = require('./lib/isAdmin')

// ================= COMMANDS =================
const helpCommand = require('./commands/help')
const pingCommand = require('./commands/ping')
const aliveCommand = require('./commands/alive')
const banCommand = require('./commands/ban')
const unbanCommand = require('./commands/unban')
const kickCommand = require('./commands/kick')

// ================= HANDLER =================
async function handleMessages(sock, messageUpdate) {
    try {
        const { messages, type } = messageUpdate
        if (type !== 'notify') return

        const msg = messages[0]
        if (!msg.message) return

        const chatId = msg.key.remoteJid
        const sender = msg.key.participant || chatId
        const isGroup = chatId.endsWith('@g.us')

        const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            ''

        const command = text.trim().toLowerCase()

        // ================= BAN CHECK =================
        if (isBanned(sender) && !command.startsWith('.unban')) {
            return sock.sendMessage(chatId, {
                text: '❌ You are banned from Alpha Bot.',
                ...channelInfo
            })
        }

        // ================= PREFIX =================
        if (!command.startsWith('.')) return

        console.log(`⚡ Command: ${command}`)

        // ================= COMMANDS =================
        switch (true) {

            case command === '.ping':
                await pingCommand(sock, chatId)
                break

            case command === '.alive':
                await aliveCommand(sock, chatId)
                break

            case command === '.help':
            case command === '.menu':
                await helpCommand(sock, chatId)
                break

            case command.startsWith('.ban'):
                await banCommand(sock, chatId, msg)
                break

            case command.startsWith('.unban'):
                await unbanCommand(sock, chatId, msg)
                break

            case command.startsWith('.kick'):
                if (!isGroup) {
                    return sock.sendMessage(chatId, {
                        text: '❌ This command works in groups only.',
                        ...channelInfo
                    })
                }

                const adminCheck = await isAdmin(sock, chatId, sender)

                if (!adminCheck.isSenderAdmin) {
                    return sock.sendMessage(chatId, {
                        text: '❌ Admin only command.',
                        ...channelInfo
                    })
                }

                await kickCommand(sock, chatId, sender, msg)
                break

            default:
                await sock.sendMessage(chatId, {
                    text: `❌ Unknown command.\nUse .help`,
                    ...channelInfo
                })
        }

    } catch (err) {
        console.error('Main Error:', err)
    }
}

// ================= GROUP EVENTS =================
async function handleGroupParticipantUpdate(sock, update) {
    try {
        console.log('👥 Group update:', update)
    } catch (err) {
        console.error(err)
    }
}

// ================= STATUS =================
async function handleStatus(sock, update) {
    // Optional
}

// ================= EXPORT =================
module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus
}