console.clear()

import makeWASocket, {
    Browsers,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState
} from "@whiskeysockets/baileys"

import { Boom } from "@hapi/boom"
import P from "pino"
import fs from "fs"

import config from "./config.js"
import { generateSessionId } from "./session.js"

const SESSION_FOLDER = "./session"

const logger = P({
    level: "silent"
})

let pairingRequested = false
let restarting = false
let sessionGenerated = false

const sleep = ms =>
    new Promise(resolve =>
        setTimeout(resolve, ms)
    )

if (!fs.existsSync(SESSION_FOLDER)) {
    fs.mkdirSync(
        SESSION_FOLDER,
        {
            recursive: true
        }
    )
}

/*
================================
RESTORE SESSION ID
================================
*/

function restoreSession() {
    if (!config.SESSION_ID) {
        return
    }

    if (
        !config.SESSION_ID.startsWith(
            "MUFASER-X~"
        )
    ) {
        console.log(
            "❌ INVALID SESSION_ID"
        )

        return
    }

    try {
        const base64 =
            config.SESSION_ID.replace(
                "MUFASER-X~",
                ""
            )

        const data =
            Buffer.from(
                base64,
                "base64"
            )

        JSON.parse(
            data.toString("utf8")
        )

        fs.writeFileSync(
            "./session/creds.json",
            data
        )

        console.log(
            "✅ MUFASER-X SESSION RESTORED"
        )

    } catch (error) {
        console.log(
            "❌ SESSION RESTORE ERROR:",
            error.message
        )
    }
}

restoreSession()

/*
================================
START BOT
================================
*/

async function startMufaserX() {

    console.log("")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("🚀 STARTING MUFASER-X")
    console.log("👑 CREATED BY ROMA-TECH")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━")

    const {
        state,
        saveCreds
    } = await useMultiFileAuthState(
        SESSION_FOLDER
    )

    const sock =
        makeWASocket({
            logger,

            browser:
                Browsers.macOS(
                    "Google Chrome"
                ),

            auth: {
                creds: state.creds,

                keys:
                    makeCacheableSignalKeyStore(
                        state.keys,
                        logger
                    )
            },

            markOnlineOnConnect: false,

            syncFullHistory: false,

            connectTimeoutMs: 60000,

            keepAliveIntervalMs: 30000,

            getMessage:
                async () => undefined
        })

    /*
    ================================
    SAVE CREDS
    ================================
    */

    sock.ev.on(
        "creds.update",
        async () => {

            await saveCreds()

            if (
                state.creds.registered &&
                !sessionGenerated
            ) {
                sessionGenerated = true

                console.log(
                    "💾 WHATSAPP SESSION SAVED"
                )

                await sleep(2000)

                generateSessionId()
            }
        }
    )

    /*
    ================================
    CONNECTION
    ================================
    */

    sock.ev.on(
        "connection.update",
        async update => {

            const {
                connection,
                lastDisconnect,
                qr
            } = update

            if (connection) {
                console.log(
                    `📡 STATUS: ${connection}`
                )
            }

            /*
            PAIRING CODE
            */

            if (
                !state.creds.registered &&
                !pairingRequested &&
                (
                    connection === "connecting" ||
                    Boolean(qr)
                )
            ) {
                pairingRequested = true

                const phoneNumber =
                    config.PHONE_NUMBER
                        .replace(/\D/g, "")

                if (!phoneNumber) {
                    console.log(
                        "❌ PHONE_NUMBER MISSING"
                    )

                    return
                }

                console.log(
                    `📱 NUMBER: ${phoneNumber}`
                )

                console.log(
                    "⏳ GENERATING CODE..."
                )

                try {
                    const code =
                        await sock
                            .requestPairingCode(
                                phoneNumber
                            )

                    const formatted =
                        code
                            ?.match(/.{1,4}/g)
                            ?.join("-") ||
                        code

                    console.log("")
                    console.log(
                        "━━━━━━━━━━━━━━━━━━━━━━━━"
                    )

                    console.log(
                        "🔐 MUFASER-X PAIRING CODE"
                    )

                    console.log("")
                    console.log(
                        `👉 ${formatted}`
                    )
                    console.log("")

                    console.log(
                        "WhatsApp → Linked devices"
                    )

                    console.log(
                        "Link a device → Link with phone number"
                    )

                    console.log(
                        "━━━━━━━━━━━━━━━━━━━━━━━━"
                    )

                } catch (error) {
                    console.log(
                        "❌ PAIRING ERROR:",
                        error?.message ||
                        error
                    )
                }
            }

            /*
            CONNECTED
            */

            if (connection === "open") {
                restarting = false
                pairingRequested = false

                console.log("")
                console.log(
                    "━━━━━━━━━━━━━━━━━━━━━━━━"
                )

                console.log(
                    "✅ MUFASER-X CONNECTED"
                )

                console.log(
                    "👑 DEVELOPER: ROMA-TECH"
                )

                console.log(
                    `📱 USER: ${sock.user?.id}`
                )

                console.log(
                    "━━━━━━━━━━━━━━━━━━━━━━━━"
                )

                if (!sessionGenerated) {
                    sessionGenerated = true

                    await sleep(2000)

                    generateSessionId()
                }
            }

            /*
            DISCONNECTED
            */

            if (connection === "close") {

                const reason =
                    new Boom(
                        lastDisconnect?.error
                    )?.output?.statusCode

                console.log(
                    `❌ CLOSED: ${reason}`
                )

                if (
                    reason ===
                    DisconnectReason.loggedOut
                ) {
                    console.log(
                        "🚪 SESSION LOGGED OUT"
                    )

                    return
                }

                if (
                    reason ===
                    DisconnectReason.restartRequired
                ) {
                    console.log(
                        "🔄 LOGIN COMPLETE — RESTARTING SOCKET"
                    )

                    await sleep(2000)

                    pairingRequested = false

                    return startMufaserX()
                }

                if (!state.creds.registered) {
                    console.log(
                        "⚠️ PAIRING CLOSED"
                    )

                    console.log(
                        "🔁 Restart panel for new code"
                    )

                    return
                }

                if (!restarting) {
                    restarting = true

                    console.log(
                        "🔄 RECONNECTING..."
                    )

                    await sleep(5000)

                    pairingRequested = false

                    return startMufaserX()
                }
            }
        }
    )

    /*
    ================================
    COMMANDS
    ================================
    */

    sock.ev.on(
        "messages.upsert",
        async ({ messages }) => {

            const msg = messages?.[0]

            if (!msg?.message) {
                return
            }

            const jid =
                msg.key.remoteJid

            if (
                !jid ||
                jid === "status@broadcast"
            ) {
                return
            }

            const text =
                msg.message
                    ?.conversation ||

                msg.message
                    ?.extendedTextMessage
                    ?.text ||

                ""

            if (
                !text.startsWith(
                    config.PREFIX
                )
            ) {
                return
            }

            const command =
                text
                    .slice(
                        config.PREFIX.length
                    )
                    .trim()
                    .split(/\s+/)[0]
                    ?.toLowerCase()

            if (command === "ping") {

                await sock.sendMessage(
                    jid,
                    {
                        text:
`🏓 *PONG!*

🤖 Bot: MUFASER-X
👑 Developer: ROMA-TECH
💫 Status: Online`
                    },
                    {
                        quoted: msg
                    }
                )
            }

            if (
                command === "menu" ||
                command === "help"
            ) {

                await sock.sendMessage(
                    jid,
                    {
                        text:
`╭━━━〔 *MUFASER-X* 〕━━━╮
┃
┃ 👑 Developer: ROMA-TECH
┃ 🤖 Status: Online
┃
╰━━━━━━━━━━━━━━━━━━╯

╭─〔 COMMANDS 〕
│ ${config.PREFIX}ping
│ ${config.PREFIX}menu
│ ${config.PREFIX}help
╰──────────────

💫 Powered By MUFASER-X`
                    },
                    {
                        quoted: msg
                    }
                )
            }
        }
    )
}

startMufaserX()
    .catch(error => {

        console.error(
            "❌ MUFASER-X ERROR:",
            error
        )
    })