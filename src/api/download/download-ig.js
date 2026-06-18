const axios = require("axios")
const cheerio = require("cheerio")

module.exports = function (app) {

  const CORS_PROXY = "https://cors.rifkyshre.biz.id/"
  const INSTADOWN_URL = "https://instadown.web.id/download"

  app.get("/download/instagram", async (req, res) => {
    try {
      const { url } = req.query
      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parametro ?url="
        })
      }

      if (!/^https?:\/\/(?:www\.|m\.)?instagram\.com\//i.test(url)) {
        return res.status(400).json({
          status: false,
          message: "URL inválida de Instagram"
        })
      }

      const response = await axios.post(
        `${CORS_PROXY}${INSTADOWN_URL}`,
        new URLSearchParams({ url }).toString(),
        {
          timeout: 30000,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
          },
          validateStatus: () => true
        }
      )

      if (response.status !== 200 || typeof response.data !== "string") {
        return res.status(500).json({
          status: false,
          message: `Error HTTP ${response.status}`
        })
      }

      const html = response.data

      if (html.includes("No media found")) {
        return res.status(404).json({
          status: false,
          message: "Media no encontrada (privado, expirado o inválido)"
        })
      }

      const $ = cheerio.load(html)

      const mediaLinks = []

      // 1. botones download
      $("button.download-btn").each((_, el) => {
        const onclick = $(el).attr("onclick") || ""
        const match = onclick.match(/forceDownload\(['"]([^'"]+)['"]/)
        if (match?.[1]) mediaLinks.push(match[1].replace(/&amp;/g, "&"))
      })

      // 2. imágenes fallback
      if (!mediaLinks.length) {
        $('img[src*="cdninstagram.com"]').each((_, el) => {
          const src = $(el).attr("src")
          if (src) mediaLinks.push(src.replace(/&amp;/g, "&"))
        })
      }

      // 3. regex fallback
      if (!mediaLinks.length) {
        const matches = html.match(/https:\/\/scontent-[^"'\s]+\.cdninstagram\.com\/[^\s"']+/g)
        if (matches) mediaLinks.push(...matches.map(u => u.replace(/&amp;/g, "&")))
      }

      if (!mediaLinks.length) {
        return res.status(404).json({
          status: false,
          message: "No se pudo extraer media"
        })
      }

      const items = mediaLinks.map(u => ({
        url: u,
        type: /\.mp4|video/i.test(u) ? "video" : "image"
      }))

      return res.json({
        status: true,
        result: {
          sourceUrl: url,
          count: items.length,
          items,
          firstVideo: items.find(i => i.type === "video")?.url || null,
          firstImage: items.find(i => i.type === "image")?.url || null
        }
      })

    } catch (e) {

      return res.status(500).json({
        status: false,
        message: e.message
      })

    }

  })

}