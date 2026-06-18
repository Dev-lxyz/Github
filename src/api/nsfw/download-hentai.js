module.exports = function (app) {

  const {
    hentaiDetail
  } = require("../../lib/veohentai")

  app.get("/nsfw/download/veohentai", async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro url"
        })
      }

      const result = await hentaiDetail(url)

      res.json(result)

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}