module.exports = function (app) {
  const axios = require('axios')

  app.get('/search/wiki', async (req, res) => {
    try {
      const q = req.query.q
      if (!q) {
        return res.status(400).json({
          status: false,
          error: 'Falta parámetro q'
        })
      }

      // 1 SOLO REQUEST (RÁPIDO)
      const { data } = await axios.get(
        `https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`,
        {
          timeout: 5000,
          headers: {
            'User-Agent': 'FastWikiAPI/1.0'
          }
        }
      )

      res.json({
        status: true,
        result: {
          title: data.title,
          description: data.description,
          summary: data.extract,
          image: data.thumbnail?.source || null,
          url: data.content_urls?.mobile?.page
        }
      })

    } catch (e) {
      res.status(404).json({
        status: false,
        error: 'No encontrado'
      })
    }
  })
}