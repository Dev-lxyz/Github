module.exports = function (app) {
  const fetch = require("node-fetch")
  const cheerio = require("cheerio")

  app.get("/nsfw/download/xvideos", async (req, res) => {
    const { url } = req.query

    if (!url || !url.includes("xvideos.com")) {
      return res.status(400).json({
        status: false,
        error: "Valid Xvideos URL is required"
      })
    }

    try {
      const html = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0"
        }
      }).then(r => r.text())

      const $ = cheerio.load(html)

      const title = $('meta[property="og:title"]').attr("content")
      const thumb = $('meta[property="og:image"]').attr("content")
      const durationSec = parseInt($('meta[property="og:duration"]').attr("content")) || 0

      const duration =
        durationSec >= 3600
          ? `${Math.floor(durationSec / 3600)}h ${Math.floor((durationSec % 3600) / 60)}m ${durationSec % 60}s`
          : durationSec >= 60
          ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
          : `${durationSec}s`

      const views = $("div#video-tabs strong.mobile-hide").text() || null
      const likes = $("span.rating-good-nbr").text() || null
      const deslikes = $("span.rating-bad-nbr").text() || null

      const videoUrl = $("#html5video a").attr("href")

      res.json({
        status: true,
        data: {
          title,
          duration,
          views,
          likes,
          deslikes,
          thumb,
          url: videoUrl
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