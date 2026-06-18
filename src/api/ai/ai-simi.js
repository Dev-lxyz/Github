const axios = require("axios")

/* =========================
   SIMI INSTANCE GLOBAL
   ========================= */
class SimiPro {
  constructor() {
    this.config = {
      uid: 509694418,
      refreshToken: "AMf-vBw4rugf0IxtWUiV2EjHGsblvtOpXVGyfGSwBhPUeIUcQWNGatozwrzcTOOVs2pJ-GfaQdNNPjj3L9d6TfUjx6gWWn4wIDuDosrAbT4B_i_Yoqe1hHkgqkpZwxwzqM61tc6u2K41L4UjxAPx2gY6TAhBjOSAIrY-dwY07aYxB78CZcgrXZJ3GEsX99AWUl-9DnFwxaKzZbqzcetLNaehNASnNlPKhztdjwoQtcVSPH4WOxNbIAEHMigg6C8MAy9rJiZ0vjACaaT2s3S-Z6FdnwVk7MAvR8nmRJNei5FCmdyaQqHeSUOI0ccHHGO7kSw2lF5BpqBKVRAAG6cfKsV5ZBDdFsbCAGGCteil3_ZXVR2BVG9RyRMJHp4mx9OhxX8q0x4IQZF6tjLrgxW8Pna-qEcU1wxGqAK9bzIG2ro9vdO4hCpNBZv5zpC5seKymSVZwU4Ce_y5",
      apiKey: "AIzaSyBa0FW_3yQoMbSLc_9Zq03mXrUXxycPU3E",
      signature: "db3013ce4c1b19da00661b14dcc3354eaea394bc244ee4c4aafac09c0df7b283",
      accessToken: null,
      lastRefresh: 0
    }
  }

  async refreshAuth(force = false) {
    const now = Date.now()
    if (!force && this.config.accessToken && now - this.config.lastRefresh < 50 * 60 * 1000) {
      return this.config.accessToken
    }

    const url = `https://securetoken.googleapis.com/v1/token?key=${this.config.apiKey}`
    const res = await axios.post(url, {
      grant_type: "refresh_token",
      refresh_token: this.config.refreshToken
    }, { timeout: 5000 })

    this.config.accessToken = res.data.access_token
    this.config.lastRefresh = now
    return this.config.accessToken
  }

  async chat(text) {
    await this.refreshAuth()

    const payload = {
      uid: this.config.uid,
      logUID: this.config.uid.toString(),
      character_id: 9075,
      message: text,
      av: "9.2.6",
      os: "a",
      lc: "id",
      cc: "KR",
      tz: "Asia/Seoul",
      reg_now_days: 0,
      is_live_chat: false
    }

    const res = await axios.post(
      "https://kube-appserver.simsimi.com:30443/ai_character/send_chat_message/stream",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.accessToken}`,
          "X-Signature": this.config.signature,
          "X-Client-Platform": "web"
        },
        responseType: "text",
        timeout: 8000
      }
    )

    const line = res.data.split("\n").find(l => l.startsWith("data: {"))
    if (!line) throw new Error("Respuesta inválida")

    const json = JSON.parse(line.replace("data: ", ""))
    return json.content
  }
}

const simi = new SimiPro()

/* =========================
   EXPRESS ENDPOINT
   ========================= */
module.exports = function (app) {

  app.get("/ai/simi", async (req, res) => {
    const text = req.query.text

    if (!text) {
      return res.status(400).json({
        status: false,
        error: "Falta parámetro: text"
      })
    }

    try {
      const reply = await simi.chat(text)

      res.json({
        status: true,
        result: reply
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: "Simi no respondió",
        details: e.message
      })
    }
  })
}