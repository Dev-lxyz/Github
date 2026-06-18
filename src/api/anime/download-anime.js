const { download } = require('../../lib/anime.js')

module.exports = function (app) {

  app.get('/anime/download/animeav1', async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro 'url'"
        })
      }

      const result = await download(url)

      res.json({
        status: true,
        result
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}