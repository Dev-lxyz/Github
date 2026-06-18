module.exports = function (app) {
  const axios = require('axios')

  const BASE = 'https://cue.cuevana3.nu'
  const SEARCH_1 = `${BASE}/wp-json/cuevana/v1/search`
  const SEARCH_2 = `${BASE}/wp-json/cuevana/v1/search-title`

  async function trySearch(url, q) {
    try {
      const { data } = await axios.get(url, {
        params: { q },
        headers: {
          referer: BASE + '/',
          'x-requested-with': 'XMLHttpRequest',
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36'
        },
        timeout: 15000
      })

      if (Array.isArray(data) && data.length) return data
      if (data?.items && Array.isArray(data.items)) return data.items
      if (data?.data && Array.isArray(data.data)) return data.data

      return null
    } catch {
      return null
    }
  }

  app.get('/search/cuevana', async (req, res) => {
    try {
      const { q } = req.query
      if (!q) {
        return res.status(400).json({
          status: false,
          error: 'Falta parámetro q'
        })
      }

      let results = await trySearch(SEARCH_1, q)
      if (!results) {
        results = await trySearch(SEARCH_2, q)
      }

      if (!results || !results.length) {
        return res.json({
          status: true,
          total: 0,
          result: []
        })
      }

      const parsed = results.map(item => {
        let url = item.url || item.permalink || item.link || null
        if (url && url.startsWith('/')) {
          url = BASE + url
        }

        return {
          title: item.title || item.name || 'Unknown',
          year: item.release || item.year || item.release_year || null,
          type: item.type || 'movie',
          url
        }
      })

      res.json({
        status: true,
        total: parsed.length,
        result: parsed
      })
    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })
}