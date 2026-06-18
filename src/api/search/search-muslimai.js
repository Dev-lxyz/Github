const axios = require("axios")

module.exports = function (app) {

  const BASE = "https://www.muslimai.io"

  const USER_AGENT =
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36"

  const DISTINCT_ID = "019ebfc5-619f-78d5-be7b-ba3494e16e3a"

  const HEADERS = {
    "authority": BASE.replace("https://", ""),
    "accept": "*/*",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "application/json",
    "origin": BASE,
    "referer": `${BASE}/`,
    "user-agent": USER_AGENT
  }

  app.get("/search/muslimai", async (req, res) => {
    try {
      const { query } = req.query

      if (!query) {
        return res.status(400).json({
          status: false,
          message: "Falta ?query="
        })
      }

      const response = await axios.post(
        `${BASE}/api/chat`,
        {
          query,
          distinctId: DISTINCT_ID
        },
        {
          headers: HEADERS,
          responseType: "stream",
          validateStatus: () => true
        }
      )

      if (response.status !== 200) {
        const chunks = []
        for await (const chunk of response.data) chunks.push(chunk)

        return res.status(500).json({
          status: false,
          message: Buffer.concat(chunks).toString("utf-8")
        })
      }

      const result = {
        sources: [],
        text: ""
      }

      let buffer = ""

      response.data.on("data", (chunk) => {

        buffer += chunk.toString()

        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {

          const trimmed = line.trim()
          if (!trimmed) continue

          try {

            const parsed = JSON.parse(trimmed)

            if (parsed.type === "sources") {
              result.sources = parsed.data
            }

            if (parsed.type === "text") {
              result.text += parsed.data
            }

          } catch {}
        }

      })

      response.data.on("end", () => {

        return res.json({
          status: true,
          result
        })

      })

      response.data.on("error", (err) => {

        return res.status(500).json({
          status: false,
          message: err.message
        })

      })

    } catch (e) {

      return res.status(500).json({
        status: false,
        message: e.message
      })

    }

  })

}