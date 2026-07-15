import fs from "fs";
import express from "express";
import { default: makeWASocket, useSingleFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } from "@whiskeysockets/baileys";
import pino from "pino";

const app = express();
const PORT = process.env.PORT || 10000;
const SESSION_ID = process.env.SESSION_ID;
const CREDS_FILE = "./session/creds.json";
let sock;

// THIS RESTORES YOUR SESSION ON START
if (SESSION_ID &&!fs.existsSync(CREDS_FILE)) {
    const base64Data = SESSION_ID.replace("MUFASER-X~", "");
    fs.mkdirSync("./session", { recursive: true });
    fs.writeFileSync(CREDS_FILE, Buffer.from(base64Data, "base64"));
    console.log("✅ Session Restored from ENV");
}

const { state, saveCreds } = useSingleFileAuthState(CREDS_FILE);

app.get('/', (req, res) => {
    res.send(`<h1>MUFASER-X BOT 👑</h1><p>Status: ${sock?.user? 'Connected ✅' : 'Not Connected ❌'}</p>`);
});

app.listen(PORT, () => console.log(`Running on ${PORT}`));

async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    sock = makeWASocket({
        version,
        logger: pino({ level: 'warn' }),
        auth: state,
        browser: Browsers.macOS('Desktop')
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type!== 'notify') return;
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim();
        const from = msg.key.remoteJid;
        console.log("RECEIVED:", text);

        if (text === '.ping') {
            await sock.sendMessage(from, { text: 'Pong! MUFASER-X is ALIVE ✅' }, { quoted: msg });
        }
        if (text === '.menu') {
            await sock.sendMessage(from, { text: '*MUFASER-X BOT* 👑\n\n.ping - Check bot\n.menu - This menu' }, { quoted: msg });
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') console.log('✅ MUFASER-X CONNECTED!');
        if (connection === 'close') setTimeout(startBot, 3000);
    });
}

startBot();