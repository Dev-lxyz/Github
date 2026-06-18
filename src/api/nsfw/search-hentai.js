module.exports = function (app) {

  const {
    searchHentai
  } = require("../../lib/veohentai")

  app.get("/nsfw/search/veohentai", async (req, res) => {
    try {
      const { q } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro q"
        })
      }

      const result = await searchHentai(q)

      res.json(result)

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}