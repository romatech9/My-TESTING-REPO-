const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const express = require('express');
const fs = require('fs-extra');
const pino = require('pino');
const app = express();
const PORT = process.env.PORT || 3000;

let sock;
let qr = null;
let pairingCode = null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home page
app.get('/', (req, res) => {
    res.send(`
        <h1>MUFASER-X BOT ✅</h1>
        <p>Status: ${sock?.user ? 'Connected' : 'Not Connected'}</p>
        <a href="/pair">Get Pairing Code</a>
    `);
});

// Pairing route
app.get('/pair', async (req, res) => {
    const number = req.query.number;
    if (!number) return res.send(`<form method="GET"><input name="number" placeholder="2567XXXXXXXX" required><button>Get Code</button></form>`);
    
    if (!sock) return res.send('Bot is starting, refresh in 5sec');
    
    try {
        const code = await sock.requestPairingCode(number.replace(/[^0-9]/g, ''));
        pairingCode = code?.match(/.{1,4}/g)?.join('-') || code;
        res.send(`<h2>Your Pairing Code: <b>${pairingCode}</b></h2><p>Enter this on WhatsApp > Linked Devices</p>`);
    } catch (e) {
        res.send('Error: ' + e.message);
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Chrome')
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const from = msg.key.remoteJid;

        if (text === '.menu') {
            await sock.sendMessage(from, { text: `*MUFASER-X BOT* 👑\n\n.menu - Show menu\n.ping - Check speed\n.owner - Owner info` });
        }
        if (text === '.ping') {
            await sock.sendMessage(from, { text: `Pong! Bot is alive ✅` });
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('✅ MUFASER-X Connected!');
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });
}

startBot();