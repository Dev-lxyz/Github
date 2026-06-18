const fetch = require("node-fetch")
const cheerio = require("cheerio")

module.exports = function (app) {

  app.get("/nsfw/download/xnxx", async (req, res) => {
    const { url } = req.query

    if (!url || !url.includes("xnxx.com")) {
      return res.status(400).json({
        status: false,
        error: "Query 'url' inválida o requerida"
      })
    }

    try {
      const html = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0",
          "accept": "text/html"
        },
        timeout: 5000
      }).then(r => r.text())

      const $ = cheerio.load(html)

      const title = $('meta[property="og:title"]').attr("content")
      const duration = $('meta[property="og:duration"]').attr("content")
      const thumbnail = $('meta[property="og:image"]').attr("content")

      const script = $("#video-player-bg script").html() || ""

      const low =
        script.match(/setVideoUrlLow\('(.*?)'\)/)?.[1] || null
      const high =
        script.match(/setVideoUrlHigh\('(.*?)'\)/)?.[1] || null
      const hls =
        script.match(/setVideoHLS\('(.*?)'\)/)?.[1] || null

      if (!low && !high && !hls) {
        return res.status(404).json({
          status: false,
          error: "No se pudo obtener el video"
        })
      }

      res.json({
        status: true,
        result: {
          title,
          duration: duration ? `${duration}s` : null,
          thumbnail,
          files: {
            low,
            high,
            hls
          }
        }
      })

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      })
    }
  })

}