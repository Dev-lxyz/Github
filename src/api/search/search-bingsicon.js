const axios = require("axios")
const cheerio = require("cheerio")

module.exports = function (app) {

  async function bingImage(query, limit = 5) {

    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      },
      timeout: 20000
    })

    const $ = cheerio.load(data)

    const all = []

    $(".iusc").each((i, el) => {

      const json = $(el).attr("m")
      if (!json) return

      try {

        const d = JSON.parse(json)

        all.push({
          title: d.t,
          image: d.murl,
          thumbnail: d.turl,
          source: d.purl
        })

      } catch {}

    })

    const shuffled = all.sort(() => 0.5 - Math.random())

    return shuffled.slice(0, limit)

  }

  // ========= ROUTE =========

  app.get("/search/bingimage", async (req, res) => {

    try {

      const { q, limit = 5 } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          error: "Falta parámetro ?q="
        })
      }

      const results = await bingImage(q, Number(limit))

      res.json({
        status: true,
        query: q,
        total: results.length,
        results
      })

    } catch (err) {

      console.error("[BING IMAGE]", err.message)

      res.status(500).json({
        status: false,
        error: err.message
      })

    }

  })

}