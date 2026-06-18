const axios = require('axios')
const cheerio = require('cheerio')

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
}

// 🔍 Función de búsqueda
async function wallpaperSearch(query, limit = 10) {
  if (!query?.trim()) throw new Error('Query vacío')

  const res = await axios.get(
    'https://www.besthdwallpaper.com/search?q=' + encodeURIComponent(query),
    { headers: HEADERS, timeout: 15000 }
  )

  const $ = cheerio.load(res.data)
  const results = []

  $('img').each((_, el) => {
    if (results.length >= limit) return false

    const src = $(el).attr('src') || ''
    if (!src.includes('bhdw.net') || src.includes('icon') || src.includes('svg')) return

    const parent = $(el).closest('a')
    const href   = parent.attr('href') || ''
    const alt    = $(el).attr('alt') || ''
    const title  = alt.replace(/\s*download\s*$/i, '').trim()

    results.push({
      title,
      image: src.startsWith('http') ? src : 'https://www.besthdwallpaper.com' + src,
      url:   href ? 'https://www.besthdwallpaper.com' + href : '',
    })
  })

  if (!results.length) throw new Error('Sin resultados para: ' + query)
  return results
}

// 🚀 ENDPOINT
module.exports = function (app) {
  app.get('/search/wallpaper', async (req, res) => {
    try {
      const { q, limit = 10 } = req.query
      if (!q) {
        return res.json({
          status: false,
          error: 'Falta query ?q='
        })
      }

      const results = await wallpaperSearch(q, parseInt(limit))
      res.json({
        status: true,
        total: results.length,
        result: results
      })
    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })
}