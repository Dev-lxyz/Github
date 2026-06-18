module.exports = function (app) {
  const axios = require("axios")

  const HEADERS = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/110 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    Referer: "https://safebooru.org/",
    Origin: "https://safebooru.org"
  }

  app.get("/search/safebooru", async (req, res) => {
    try {
      const { q, limit = 20 } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Falta parámetro ?q="
        })
      }

      // 🔥 controlar límite (máx 50)
      const safeLimit = Math.min(parseInt(limit) || 20, 50)

      const url = `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(q)}`

      const response = await axios.get(url, {
        headers: HEADERS,
        timeout: 8000
      })

      const data = response.data

      if (!data || !data.length) {
        return res.status(404).json({
          status: false,
          message: "No se encontraron resultados"
        })
      }

      // 🔥 aplicar limit aquí
      const result = data.slice(0, safeLimit).map(v => ({
        id: v.id,
        tags: v.tags,
        source: v.source,
        width: v.width,
        height: v.height,
        score: v.score,
        file_url: v.file_url,
        preview_url: v.preview_url,
        sample_url: v.sample_url
      }))

      return res.json({
        status: true,
        total: result.length,
        data: result
      })
    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message || "Error interno"
      })
    }
  })
}