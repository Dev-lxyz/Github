const fetch = require("node-fetch")

module.exports = function (app) {
  async function gpt41nano(prompt) {
    const url = "https://text.pollinations.ai/openai"
    const data = {
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "openai",
      stream: false
    }

    const headers = {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
      "user-agent": "Mozilla/5.0 (Linux; Android 14; NX769J Build/UKQ1.230917.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36"
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(data)
      })

      const json = await response.json()
      return {
        status: true,
        data: {
          model: "GPT-4.1 Nano",
          response: json.choices?.[0]?.message?.content || ""
        }
      }

    } catch (e) {
      return {
        status: false,
        model: "GPT-4.1 Nano",
        message: e.message
      }

    }
  }

  app.get("/ai/gpt41nano", async (req, res) => {
    try {
      const { prompt } = req.query
      if (!prompt) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro prompt"
        })
      }

      const result = await gpt41nano(prompt)
      return res.json(result)
    } catch (e) {

      return res.status(500).json({
        status: false,
        message: e.message
      })

    }
  })

}