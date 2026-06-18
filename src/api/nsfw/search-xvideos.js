module.exports = function (app) {
  const axios = require("axios")
  const cheerio = require("cheerio")

  app.get("/nsfw/xvideos-search", async (req, res) => {
    const { q } = req.query

    if (!q) {
      return res.status(400).json({
        status: false,
        error: "Query 'q' is required"
      })
    }

    try {
      const url = `https://www.xvideos.com/?k=${encodeURIComponent(q)}`
      const { data } = await axios.get(url, {
        headers: {
          "user-agent": "Mozilla/5.0"
        },
        timeout: 8000
      })

      const $ = cheerio.load(data)
      const results = []

      $("div.mozaique > div").each((_, el) => {
        const a = $(el).find("p.title a")
        const title = a.attr("title")
        const href = a.attr("href")
        if (!title || !href) return

        const quality = $(el).find("span.video-hd-mark").text().trim()

        results.push({
          title,
          url: "https://www.xvideos.com" + href,
          quality: quality || null
        })
      })

      res.json({
        status: true,
        query: q,
        total: results.length,
        result: results
      })

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      })
    }
  })
}