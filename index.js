const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;
let sock;

app.get('/', (req, res) => {
    res.send(`<h1>MUFASER-X BOT ✅</h1><p>Status: ${sock?.user ? 'Connected' : 'Scan Again'}</p><a href="/pair">Get Pairing Code</a>`);
});

app.get('/pair', async (req, res) => {
    const number = req.query.number;
    if (!number) return res.send(`<form method="GET"><input name="number" placeholder="2567XXXXXXXX" required><button>Get Code</button></form>`);
    if (!sock) return res.send('Wait 5sec and refresh');
    try {
        const code = await sock.requestPairingCode(number.replace(/[^0-9]/g, ''));
        res.send(`<h2>Code: <b>${code.match(/.{1,4}/g).join('-')}</b></h2>`);
    } catch (e) {
        res.send('Error: ' + e.message);
    }
});

app.listen(PORT, () => console.log(`Running on ${PORT}`));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({ version, auth: state, browser: Browsers.macOS('Desktop') });
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = (msg.message.conversation || '').toLowerCase().trim();
        const from = msg.key.remoteJid;
        console.log("GOT:", text);
        if (text === '.ping') await sock.sendMessage(from, { text: 'Pong! ✅' }, { quoted: msg });
        if (text === '.menu') await sock.sendMessage(from, { text: '*MUFASER-X* 👑\n.menu\n.ping' }, { quoted: msg });
    });

    sock.ev.on('connection.update', (u) => {
        if (u.connection === 'close') setTimeout(startBot, 3000);
    });
}
startBot();