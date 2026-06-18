module.exports = function (app) {
  const axios = require("axios")
  const cheerio = require("cheerio")

  app.get("/search/fdroid", async (req, res) => {
    try {
      const { q } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro ?q="
        })
      }

      const url = `https://search.f-droid.org/?q=${encodeURIComponent(q)}&lang=en`

      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "text/html"
        },
        timeout: 15000
      })

      const $ = cheerio.load(response.data)
      const results = []

      $("a.package-header").slice(0, 20).each((_, el) => {
        const name = $(el).find(".package-name").text().trim()
        const description = $(el).find(".package-summary").text().trim()
        const link = $(el).attr("href")
        const icon = $(el).find("img").attr("src")

        if (name && link) {
          results.push({
            name,
            description,
            url: link.startsWith("http")
              ? link
              : `https://f-droid.org${link}`,
            icon: icon
              ? icon.startsWith("http")
                ? icon
                : `https://search.f-droid.org${icon}`
              : null
          })
        }
      })

      res.json({
        status: true,
        query: q,
        total: results.length,
        data: results
      })

    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message
      })
    }
  })
}