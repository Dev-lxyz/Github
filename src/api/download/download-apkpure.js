const axios = require('axios')
const cheerio = require('cheerio')

module.exports = function (app) {

  const UA = 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
  const BASE = 'https://apkpure.net'
  const DL_BASE = 'https://d.apkpure.net'
  const HEADERS = {
    'User-Agent': UA,
    'Referer': BASE
  }

  function extractPkg(href) {
    const m = href?.match(/\/((?:com|org|net|io|co)\.[a-z0-9.]+)(?:\/|$)/i)
    return m ? m[1] : ''
  }

  function parsePageData(data) {
    try {
      const m = data.match(/window\.apkpure\s*=\s*\{pageData:\s*(\{.*?\})\s*[,;]/s)
      if (m) return JSON.parse(m[1])
    } catch {}
    return null
  }

  // =========================
  // 🔎 SEARCH
  // =========================
  async function apkSearch(query, limit = 5) {
    const { data } = await axios.get(`${BASE}/search?q=${encodeURIComponent(query)}`, {
      headers: HEADERS,
      timeout: 15000
    })

    const $ = cheerio.load(data)
    const results = []
    const seen = new Set()

    $('.search-brand-container').each((_, el) => {
      if (results.length >= limit) return false

      const name = $(el).find('a.top').first().text().trim()
      const dev = $(el).find('a.developer').first().text().trim()
      const date = $(el).find('span.time').first().text().trim()
      const icon = $(el).find('img.app-icon-img').first().attr('data-original') || ''
      const href = $(el).find('a.top').attr('href') || ''

      const pkg = extractPkg(href)
      if (!name || !pkg || seen.has(pkg)) return

      seen.add(pkg)

      results.push({
        name,
        developer: dev,
        package: pkg,
        update: date,
        icon,
        url: href.startsWith('http') ? href : BASE + href,
        download: `${DL_BASE}/b/APK/${pkg}?version=latest`
      })
    })

    return results
  }

  // =========================
  // 📥 DOWNLOAD / INFO
  // =========================
  async function apkInfo(pkgOrUrl) {
    let pkg = pkgOrUrl.includes('apkpure')
      ? extractPkg(pkgOrUrl)
      : pkgOrUrl

    const shortName = pkg.split('.').slice(-2).join('-')

    const { data } = await axios.get(`${BASE}/${shortName}/${pkg}/download`, {
      headers: HEADERS,
      timeout: 15000
    })

    const $ = cheerio.load(data)
    const pageData = parsePageData(data)

    const name =
      pageData?.versionName
        ? $('title').text().split(' APK')[0].replace('Download ', '').trim()
        : $('h1').first().text().trim()

    const version =
      pageData?.versionName ||
      $('[class*="version"]').first().text().match(/[\d.]+/)?.[0] || ''

    const size = $('[class*="size"]').first().text().trim()
    const icon = $('img').first().attr('src') || ''
    const dev = $('[class*="developer"]').first().text().trim()

    return {
      name,
      developer: dev,
      package: pkg,
      version,
      size,
      icon,
      download_apk: `${DL_BASE}/b/APK/${pkg}?version=latest`,
      download_xapk: `${DL_BASE}/b/XAPK/${pkg}?version=latest`,
      url: `${BASE}/${shortName}/${pkg}`
    }
  }

  // =========================
  // 🌐 ROUTES
  // =========================

  // 🔎 Buscar apps
  app.get('/search/xd', async (req, res) => {
    try {
      const { q, limit } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          error: 'Falta parámetro "q"'
        })
      }

      const results = await apkSearch(q, parseInt(limit) || 5)

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

  // 📥 Info + descarga
  app.get('/download/apkpure', async (req, res) => {
    try {
      const { url, pkg } = req.query

      if (!url && !pkg) {
        return res.status(400).json({
          status: false,
          error: 'Pasa "url" o "pkg"'
        })
      }

      const result = await apkInfo(url || pkg)

      res.json({
        status: true,
        result
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })

}