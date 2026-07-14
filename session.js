import fs from "fs"

const CREDS_FILE = "./session/creds.json"
const OUTPUT_FILE = "./SESSION_ID.txt"
const PREFIX = "MUFASER-X~"

export function generateSessionId() {
    if (!fs.existsSync(CREDS_FILE)) {
        console.log("❌ creds.json not found")
        return null
    }

    try {
        const data = fs.readFileSync(CREDS_FILE)

        const base64 = data.toString("base64")

        const sessionId =
            PREFIX + base64

        fs.writeFileSync(
            OUTPUT_FILE,
            sessionId
        )

        console.log("")
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━")
        console.log("🔐 MUFASER-X SESSION ID")
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━")
        console.log("")
        console.log(sessionId)
        console.log("")
        console.log("📁 Saved to SESSION_ID.txt")
        console.log("⚠️ KEEP THIS SESSION PRIVATE")
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━")

        return sessionId

    } catch (error) {
        console.log(
            "❌ SESSION ERROR:",
            error.message
        )

        return null
    }
}

if (
    process.argv[1]?.endsWith("session.js")
) {
    generateSessionId()
}