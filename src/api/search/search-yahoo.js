/*
* Yahoo Search Endpoint
* By: shadow
*/

const { search } = require('../../lib/yahoo')

module.exports = function(app) {

  app.get('/search/yahoo', async (req, res) => {
    const { q } = req.query

    if (!q) {
      return res.status(400).json({
        status: false,
        error: 'Falta parámetro ?q='
      })
    }

    try {
      const results = await search(q)

      res.json({
        status: true,
        query: q,
        total: results.length,
        result: results
      })

    } catch (err) {
      res.status(500).json({
        status: false,
        error: 'Error Yahoo Search',
        detail: err.message
      })
    }
  })

}