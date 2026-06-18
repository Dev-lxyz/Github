const { detail } = require('../../lib/anime.js')

module.exports = function (app) {

  app.get('/anime/detail/animeav1', async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro 'url'"
        })
      }

      const result = await detail(url)

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