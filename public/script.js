const numberInput =
    document.getElementById("number")

const pairButton =
    document.getElementById("pairButton")

const formBox =
    document.getElementById("formBox")

const resultBox =
    document.getElementById("resultBox")

const statusText =
    document.getElementById("statusText")

const codeBox =
    document.getElementById("codeBox")

const pairCode =
    document.getElementById("pairCode")

const copyButton =
    document.getElementById("copyButton")

let statusTimer = null

function cleanNumber(value) {
    return String(value || "")
        .replace(/\D/g, "")
}

function setStatus(message) {
    statusText.textContent = message
}

async function startPairing() {
    const number =
        cleanNumber(numberInput.value)

    if (!number || number.length < 8) {
        alert(
            "Enter a valid WhatsApp number with country code"
        )

        return
    }

    pairButton.disabled = true

    pairButton.textContent =
        "Generating Code..."

    formBox.classList.add("hidden")

    resultBox.classList.remove("hidden")

    setStatus(
        "Connecting to MUFASER-X..."
    )

    try {
        const response = await fetch(
            "/api/pair",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    number
                })
            }
        )

        const data =
            await response.json()

        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.message ||
                "Pairing failed"
            )
        }

        setStatus(
            "Preparing pairing code..."
        )

        checkStatus(data.id)

    } catch (error) {
        setStatus(
            `Error: ${error.message}`
        )

        pairButton.disabled = false

        pairButton.textContent =
            "Generate Pairing Code"

        formBox.classList.remove("hidden")
    }
}

function checkStatus(id) {
    clearInterval(statusTimer)

    statusTimer = setInterval(
        async () => {
            try {
                const response =
                    await fetch(
                        `/api/status/${id}`
                    )

                const data =
                    await response.json()

                if (!data.success) {
                    throw new Error(
                        data.message ||
                        "Session not found"
                    )
                }

                if (
                    data.status ===
                    "code_ready"
                ) {
                    setStatus(
                        "Pairing code ready"
                    )

                    pairCode.textContent =
                        data.code

                    codeBox.classList.remove(
                        "hidden"
                    )
                }

                if (
                    data.status ===
                    "connected"
                ) {
                    setStatus(
                        "WhatsApp connected. Generating session..."
                    )
                }

                if (
                    data.status ===
                    "restarting"
                ) {
                    setStatus(
                        "Pairing complete. Restarting connection..."
                    )
                }

                if (
                    data.status ===
                    "session_ready"
                ) {
                    clearInterval(statusTimer)

                    setStatus(
                        "✅ SESSION ID SENT TO YOUR WHATSAPP DM"
                    )

                    codeBox.classList.add(
                        "hidden"
                    )
                }

                if (
                    data.status ===
                    "pairing_error" ||
                    data.status ===
                    "session_error" ||
                    data.status ===
                    "logged_out"
                ) {
                    clearInterval(statusTimer)

                    setStatus(
                        `❌ ${data.error || data.status}`
                    )
                }

            } catch (error) {
                clearInterval(statusTimer)

                setStatus(
                    `Error: ${error.message}`
                )
            }
        },
        1500
    )
}

async function copyCode() {
    const code =
        pairCode.textContent
            .replace(/-/g, "")

    try {
        await navigator.clipboard.writeText(
            code
        )

        copyButton.textContent =
            "Copied ✅"

        setTimeout(() => {
            copyButton.textContent =
                "Copy Code"
        }, 2000)

    } catch {
        alert(
            "Copy failed. Hold the code and copy it manually."
        )
    }
}

pairButton.addEventListener(
    "click",
    startPairing
)

copyButton.addEventListener(
    "click",
    copyCode
)

numberInput.addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            startPairing()
        }
    }
)