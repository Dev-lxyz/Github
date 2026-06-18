module.exports = function (app) {
  const axios = require("axios")
  const cheerio = require("cheerio")

  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

  app.get('/nsfw/download/pornhub', async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          error: "Falta el parámetro 'url'"
        })
      }

      if (!url.includes("pornhub.com/view_video")) {
        return res.status(400).json({
          status: false,
          error: "URL inválida. Debe ser una URL de pornhub.com/view_video.php?viewkey=..."
        })
      }

      const data = await scrapePornhub(url)

      res.json({
        status: true,
        result: data
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })

  async function scrapePornhub(url) {
    const { data: html } = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://www.pornhub.com/"
      }
    })

    const $ = cheerio.load(html)
    const title = $("h1.title span").text().trim()
      || $("h1.title").text().trim()
      || "Sin título"

    const thumbnail = $('meta[property="og:image"]').attr("content") || null
    const mediaMatch = html.match(/var\s+mediaDefinitions\s*=\s*(\[[\s\S]*?\])\s*;/)

    if (!mediaMatch) {
      const flashMatch = html.match(/flashvars_\d+\s*=\s*(\{[\s\S]*?\})\s*;/)
      if (!flashMatch) throw new Error("No se pudieron extraer los links del video. El video puede ser premium o estar eliminado.")

      const flashRaw = flashMatch[1]
      const mediaInFlash = flashRaw.match(/"mediaDefinitions"\s*:\s*(\[[\s\S]*?\])/)
      if (!mediaInFlash) throw new Error("No se encontraron calidades de video.")

      return buildResult(title, thumbnail, parseMediaDefs(mediaInFlash[1]))
    }

    return buildResult(title, thumbnail, parseMediaDefs(mediaMatch[1]))
  }

  function parseMediaDefs(raw) {
    let parsed
    try {
      const clean = raw
        .replace(/'/g, '"')
        .replace(/,\s*]/g, "]")
        .replace(/,\s*}/g, "}")

      parsed = JSON.parse(clean)
    } catch {

      const urls   = [...raw.matchAll(/"videoUrl"\s*:\s*"([^"]+)"/g)].map(m => m[1])
      const quals  = [...raw.matchAll(/"quality"\s*:\s*"?(\d+)"?/g)].map(m => m[1])

      return urls.map((u, i) => ({
        quality: (quals[i] || "?") + "p",
        url: u.replace(/\\/g, "")
      })).filter(v => v.url.includes(".mp4"))
    }
    return parsed
      .filter(v => v.videoUrl && /^\d+$/.test(String(v.quality)))
      .map(v => ({
        quality: v.quality + "p",
        url: v.videoUrl.replace(/\\/g, "")
      }))
      .sort((a, b) => parseInt(b.quality) - parseInt(a.quality))
  }

  function buildResult(title, thumbnail, videos) {
    if (!videos || videos.length === 0) {
      throw new Error("No se encontraron fuentes de video. Puede ser premium.")
    }

    return {
      title,
      thumbnail,
      videos: videos.map(v => ({
        quality: v.quality,
        download_url: v.url
      }))
    }
  }
}
