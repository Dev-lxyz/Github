const axios = require('axios')

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
}

module.exports = function(app) {

  app.get('/tools/short', async (req, res) => {
    try {
      const { url, expand } = req.query
      if (url) {
        if (!url.startsWith('http')) {
          return res.json({
            status: false,
            error: 'URL inválida (usa http/https)'
          })
        }

        const errors = []
        try {
          const r = await axios.get(
            `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`,
            { headers: HEADERS, timeout: 10000 }
          )

          if (r.data?.shorturl) {
            return res.json({
              status: true,
              result: {
                original: url,
                short: r.data.shorturl,
                source: 'is.gd'
              }
            })
          }
        } catch (e) {
          errors.push('is.gd')
        }

        // intento tinyurl
        try {
          const r = await axios.get(
            `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
            { headers: HEADERS, timeout: 10000 }
          )

          if (typeof r.data === 'string' && r.data.startsWith('http')) {
            return res.json({
              status: true,
              result: {
                original: url,
                short: r.data.trim(),
                source: 'tinyurl'
              }
            })
          }
        } catch (e) {
          errors.push('tinyurl')
        }

        return res.json({
          status: false,
          error: 'No se pudo acortar',
          tried: errors
        })
      }

      if (expand) {
        const r = await axios.get(expand, {
          headers: HEADERS,
          maxRedirects: 10,
          timeout: 10000
        })

        return res.json({
          status: true,
          result: {
            original: expand,
            expanded: r.request?.res?.responseUrl || expand
          }
        })
      }

      res.json({
        status: false,
        error: 'Usa ?url= para acortar o ?expand= para expandir'
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })

}