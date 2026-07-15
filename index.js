const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const express = require('express');
const fs = require('fs-extra');
const pino = require('pino');
const app = express();
const PORT = process.env.PORT || 3000;

let sock;

app.get('/', (req, res) => {
    res.send(`<h1>MUFASER-X BOT ✅</h1><p>Status: ${sock?.user ? 'Connected' : 'Not Connected'}</p><a href="/pair">Get Pairing Code</a>`);
});

app.get('/pair', async (req, res) => {
    const number = req.query.number;
    if (!number) return res.send(`<form method="GET"><input name="number" placeholder="2567XXXXXXXX" required><button>Get Code</button></form>`);
    if (!sock) return res.send('Bot starting, refresh in 5sec');
    try {
        const code = await sock.requestPairingCode(number.replace(/[^0-9]/g, ''));
        const pairingCode = code?.match(/.{1,4}/g)?.join('-') || code;
        res.send(`<h2>Your Pairing Code: <b>${pairingCode}</b></h2><p>WhatsApp > Linked Devices > Link with phone number</p>`);
    } catch (e) {
        res.send('Error: ' + e.message);
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Keep alive to stop Render from sleeping
setInterval(() => {
    fetch(`https://my-testing-repo.onrender.com`)
}, 600000)

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        version,
        logger: pino({ level: 'warn' }), // so we see errors
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop')
    });

    sock.ev.on('creds.update', saveCreds);
    
    // THIS IS THE FIX - proper message handler
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim();
        const from = msg.key.remoteJid;

        console.log("RECEIVED:", text);

        if (text === '.menu') {
            await sock.sendMessage(from, { text: `*MUFASER-X BOT* 👑\n\n.menu - Show menu\n.ping - Check speed\n.owner - Owner info` }, { quoted: msg });
        }
        else if (text === '.ping') {
            await sock.sendMessage(from, { text: `Pong! Bot is alive ✅` }, { quoted: msg });
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('✅ MUFASER-X Connected!');
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Reconnecting...', shouldReconnect);
            if (shouldReconnect) startBot();
        }
    });
}

startBot();