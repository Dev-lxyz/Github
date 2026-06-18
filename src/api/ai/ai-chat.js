const crypto = require("node:crypto")

module.exports = function (app) {

  const base_url = "https://www.chatday.ai"

  const baseHeaders = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
    "Origin": base_url,
    "Referer": `${base_url}/chat`
  }

  const MODELS = [
    "openai/gpt-5.5",
    "openai/gpt-5.4",
    "openai/gpt-5.3-chat",
    "openai/gpt-5.1-instant",
    "openai/gpt-5",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "xai/grok-4.1-fast-non-reasoning",
    "anthropic/claude-haiku-4.5",
    "anthropic/claude-sonnet-4.6",
    "anthropic/claude-opus-4.5",
    "anthropic/claude-opus-4.6",
    "anthropic/claude-opus-4.7",
    "anthropic/claude-opus-4.8",
    "anthropic/claude-fable-5",
    "deepseek/deepseek-v4-pro",
    "deepseek/deepseek-v4-flash",
    "deepseek/deepseek-v3.2-thinking",
    "google/gemini-3.1-pro-preview",
    "google/gemini-3-pro-preview",
    "google/gemini-3.1-flash-lite",
    "alibaba/qwen3-max",
    "meta/llama-4-maverick",
    "moonshotai/kimi-k2.6"
  ]

  async function signInAnonymous() {
    const r = await fetch(`${base_url}/api/auth/sign-in/anonymous`, {
      method: "POST",
      headers: { ...baseHeaders, "Content-Type": "application/json" },
      body: "{}"
    })

    if (!r.ok) return null

    const setCookie = r.headers.getSetCookie?.() ?? [r.headers.get("set-cookie")].filter(Boolean)
    const cookie = setCookie.map(c => c.split(";")[0]).join("; ")

    return { cookie }
  }

  app.get("/ai/chat", async (req, res) => {

    try {

      const { prompt, model } = req.query

      // ❌ falta prompt o model
      if (!prompt || !model) {
        return res.status(400).json({
          status: false,
          message: "Faltan parámetros ?prompt= y ?model=",
          availableModels: MODELS
        })
      }

      // ❌ modelo inválido
      if (!MODELS.includes(model)) {
        return res.status(400).json({
          status: false,
          message: "Modelo inválido",
          availableModels: MODELS
        })
      }

      const auth = await signInAnonymous()

      if (!auth) {
        return res.status(500).json({
          status: false,
          message: "Error en autenticación"
        })
      }

      const visitorId = crypto.randomUUID().replace(/-/g, "")
      const conversationId =
        Math.random().toString(36).slice(2, 10).toUpperCase() +
        Math.random().toString(36).slice(2, 10).toUpperCase()

      const r = await fetch(`${base_url}/api/v2/chat/anonymous`, {
        method: "POST",
        headers: {
          ...baseHeaders,
          "Content-Type": "application/json",
          "Cookie": auth.cookie,
          "Accept": "text/event-stream"
        },
        body: JSON.stringify({
          content: prompt,
          model,
          visitorId,
          conversationId
        })
      })

      if (!r.ok) {
        return res.status(500).json({
          status: false,
          message: "Error en chat request"
        })
      }

      const reader = r.body.getReader()
      const decoder = new TextDecoder()

      let buf = ""
      let full = ""

      while (true) {

        const { value, done } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })

        const lines = buf.split("\n")
        buf = lines.pop()

        for (const line of lines) {

          if (!line.startsWith("data:")) continue

          const payload = line.slice(5).trim()
          if (!payload) continue

          try {
            const evt = JSON.parse(payload)
            if (evt.type === "text-delta" && evt.delta) {
              full += evt.delta
            }
          } catch {}
        }
      }

      return res.json({
        status: true,
        model,
        result: full
      })

    } catch (e) {

      return res.status(500).json({
        status: false,
        message: e.message
      })

    }

  })

}