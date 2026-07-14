import dotenv from "dotenv"

dotenv.config({ quiet: true })

export default {
    PHONE_NUMBER: process.env.PHONE_NUMBER || "",
    BOT_NAME: process.env.BOT_NAME || "MUFASER-X",
    OWNER_NAME: process.env.OWNER_NAME || "ROMA-TECH",
    PREFIX: process.env.PREFIX || ".",
    SESSION_ID: process.env.SESSION_ID || ""
}