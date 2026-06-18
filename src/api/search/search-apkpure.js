const axios = require('axios')
const cheerio = require('cheerio')

const BASE = 'https://apkpure.net'
const DL_BASE = 'https://d.apkpure.net'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 11)',
  'Referer': BASE
}

// 🔹 extraer package
function extractPkg(href) {
  const m = href?.match(/\/((?:com|org|net|io|co)\.[a-z0-9.]+)(?:\/|$)/i)
  return m ? m[1] : ''
}

// 🔍 SEARCH MULTI (rápido + size + icon fix)
async function apkSearch(query, limit = 10) {
  const { data } = await axios.get(`${BASE}/search?q=${encodeURIComponent(query)}`, {
    headers: HEADERS,
    timeout: 10000
  })

  const $ = cheerio.load(data)
  const results = []
  const seen = new Set()

  $('.search-brand-container').each((_, el) => {
    if (results.length >= limit) return false

    const name = $(el).find('a.top').text().trim()
    const dev = $(el).find('a.developer').text().trim()
    const appHref = $(el).find('a.top').attr('href') || ''
    const pkg = extractPkg(appHref)

    const img = $(el).find('img.app-icon-img')
    const icon =
      img.attr('data-original') ||
      img.attr('src') ||
      img.attr('data-src') ||
      ''

    // 🔥 SIZE directo del search (sin request extra)
    const size =
      $(el).find('.size').text().trim() ||
      $(el).find('.additional-info').text().match(/[\d.]+\s?(MB|GB)/i)?.[0] ||
      'Unknown'

    if (!name || !pkg || seen.has(pkg)) return
    seen.add(pkg)

    results.push({
      name,
      developer: dev,
      package: pkg,
      size,
      icon,
      page: appHref.startsWith('http') ? appHref : BASE + appHref,
      apk_url: `${DL_BASE}/b/APK/${pkg}?version=latest`,
      xapk_url: `${DL_BASE}/b/XAPK/${pkg}?version=latest`
    })
  })

  if (!results.length) throw new Error('No resultados')
  return results
}

// 🚀 ENDPOINT
module.exports = function (app) {

  app.get('/search/apkpure', async (req, res) => {
    try {
      const { q, limit = 10 } = req.query

      if (!q) {
        return res.json({
          status: false,
          error: 'Falta query ?q='
        })
      }

      const results = await apkSearch(q, parseInt(limit))

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