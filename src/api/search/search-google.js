const axios = require('axios')

module.exports = function (app) {

  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
  }

  async function googleSearch(query, limit = 5) {
    const res = await axios.get(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      {
        headers: HEADERS,
        timeout: 15000
      }
    )

    const data = res.data
    const results = []

    // Resultado principal
    if (data?.AbstractText && data?.AbstractURL) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.AbstractText,
        source: 'instant'
      })
    }

    // Resultados relacionados
    for (const item of (data?.RelatedTopics || [])) {
      if (results.length >= limit) break

      if (item?.Topics) {
        for (const sub of item.Topics) {
          if (results.length >= limit) break

          if (sub?.FirstURL && sub?.Text) {
            results.push({
              title: sub.Text.split(' - ')[0] || sub.Text.slice(0, 60),
              url: sub.FirstURL,
              snippet: sub.Text,
              source: 'related'
            })
          }
        }
      } else if (item?.FirstURL && item?.Text) {
        results.push({
          title: item.Text.split(' - ')[0] || item.Text.slice(0, 60),
          url: item.FirstURL,
          snippet: item.Text,
          source: 'related'
        })
      }
    }

    if (!results.length) throw new Error('Sin resultados')

    return results.slice(0, limit)
  }

  app.get('/search/google', async (req, res) => {
    try {
      const { q, limit = 15 } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          error: 'Falta parámetro "q"'
        })
      }

      const results = await googleSearch(q, parseInt(limit) || 5)

      res.json({
        status: true,
        query: q,
        total: results.length,
        results
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })

}