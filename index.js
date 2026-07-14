console.clear()

import express from "express"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import P from "pino"
import makeWASocket, {
    Browsers,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState
} from "baileys"

const app = express()
const PORT = process.env.PORT || 3000
const logger = P({ level: "silent" })

app.use(express.json())
app.use(express.static("public"))

const clients = new Map()

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

function cleanNumber(number) {
    return String(number || "").replace(/\D/g, "")
}

function makeId() {
    return crypto.randomBytes(12).toString("hex")
}

function getSessionId(folder) {
    const file = path.join(folder, "creds.json")

    if (!fs.existsSync(file)) {
        throw new Error("Session credentials not found")
    }

    const data = fs.readFileSync(file)

    return `MUFASER-X:~${data.toString("base64")}`
}

async function connectSession(id, number, folder) {
    const { state, saveCreds } =
        await useMultiFileAuthState(folder)

    let pairingRequested = false

    const sock = makeWASocket({
        logger,

        browser: Browsers.macOS("Google Chrome"),

        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
                state.keys,
                logger
            )
        },

        syncFullHistory: false,
        markOnlineOnConnect: false,

        getMessage: async () => undefined
    })

    let client = clients.get(id)

    if (!client) {
        client = {
            status: "connecting",
            code: null,
            error: null,
            sessionId: null
        }

        clients.set(id, client)
    }

    client.sock = sock

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on(
        "connection.update",
        async update => {
            const {
                connection,
                lastDisconnect,
                qr
            } = update

            if (connection) {
                client.status = connection
            }

            if (
                !state.creds.registered &&
                !pairingRequested &&
                (
                    connection === "connecting" ||
                    Boolean(qr)
                )
            ) {
                pairingRequested = true

                try {
                    const code =
                        await sock.requestPairingCode(number)

                    client.code =
                        code?.match(/.{1,4}/g)?.join("-") ||
                        code

                    client.status = "code_ready"

                    console.log(
                        `🔐 Pairing code: ${client.code}`
                    )
                } catch (error) {
                    client.status = "pairing_error"
                    client.error = error.message

                    console.error(
                        "Pairing error:",
                        error.message
                    )
                }
            }

            if (connection === "open") {
                await saveCreds()
                await sleep(2500)

                try {
                    const sessionId =
                        getSessionId(folder)

                    client.sessionId = sessionId
                    client.status = "session_ready"

                    const jid = sock.user?.id

                    if (jid) {
                        await sock.sendMessage(jid, {
                            text:
`🔐 *MUFASER-X SESSION ID*

${sessionId}

⚠️ KEEP THIS SESSION ID PRIVATE

🤖 MUFASER-X
👑 ROMA-TECH`
                        })
                    }

                    console.log(
                        "✅ MUFASER-X SESSION GENERATED"
                    )
                } catch (error) {
                    client.status = "session_error"
                    client.error = error.message
                }
            }

            if (connection === "close") {
                const reason =
                    lastDisconnect?.error?.output?.statusCode

                console.log(
                    `📡 Connection closed: ${reason}`
                )

                if (
                    reason ===
                    DisconnectReason.restartRequired
                ) {
                    client.status = "restarting"

                    await sleep(2000)

                    return connectSession(
                        id,
                        number,
                        folder
                    )
                }

                if (
                    reason ===
                    DisconnectReason.loggedOut
                ) {
                    client.status = "logged_out"
                    client.error = "WhatsApp session logged out"

                    return
                }

                if (state.creds.registered) {
                    await sleep(3000)

                    return connectSession(
                        id,
                        number,
                        folder
                    )
                }
            }
        }
    )
}

app.post("/api/pair", async (req, res) => {
    const number = cleanNumber(req.body.number)

    if (!number || number.length < 8) {
        return res.status(400).json({
            success: false,
            message:
                "Enter WhatsApp number with country code"
        })
    }

    const id = makeId()

    const folder =
        path.join("sessions", id)

    fs.mkdirSync(folder, {
        recursive: true
    })

    clients.set(id, {
        status: "starting",
        code: null,
        error: null,
        sessionId: null
    })

    try {
        await connectSession(
            id,
            number,
            folder
        )

        res.json({
            success: true,
            id
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
})

app.get("/api/status/:id", (req, res) => {
    const client = clients.get(req.params.id)

    if (!client) {
        return res.status(404).json({
            success: false,
            message: "Pairing request not found"
        })
    }

    res.json({
        success: true,
        status: client.status,
        code: client.code,
        error: client.error
    })
})

app.get("/", (req, res) => {
    res.sendFile(
        path.resolve("public/index.html")
    )
})

app.listen(PORT, () => {
    console.log("")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("🚀 MUFASER-X PAIRING SITE")
    console.log("👑 ROMA-TECH")
    console.log(`🌐 PORT: ${PORT}`)
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━")
})