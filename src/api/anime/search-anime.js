const { search } = require('../../lib/anime.js')

module.exports = function (app) {

  app.get('/anime/search/animeav1', async (req, res) => {
    try {
      const { q } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro 'q'"
        })
      }

      const result = await search(q)

      res.json({
        status: true,
        total: result.length,
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