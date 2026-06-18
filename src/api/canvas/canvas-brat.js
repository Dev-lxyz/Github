module.exports = function (app) {
  const axios = require("axios")

  app.get("/canvas/brat", async (req, res) => {
    try {
      const { text } = req.query

      if (!text) {
        return res.status(400).json({
          status: false,
          error: "Falta el parámetro ?text="
        })
      }

      const imageUrl = `https://brat.siputzx.my.id/image?text=${encodeURIComponent(text)}`

      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Referer": "https://brat.siputzx.my.id/"
        }
      })

      // 🖼️ Responder imagen directa
      res.setHeader("Content-Type", "image/png")
      res.setHeader("Cache-Control", "public, max-age=86400")
      res.send(response.data)

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      })
    }
  })
}