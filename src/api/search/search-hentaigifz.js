module.exports = function (app) {
  const axios = require('axios')

  const BASE = 'https://hentaigifz.com'

  const HDR = {
    'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:150.0) Gecko/150.0 Firefox/150.0',
    'Accept': 'text/html'
  }

  async function fetchHTML(url) {
    const { data, status } = await axios.get(url, { headers: HDR, timeout: 15000 })
    if (status < 200 || status >= 300) throw new Error(`HTTP ${status}`)
    return data
  }

  function extractSlugs(html) {
    const slugs = []
    const regex = /<a[^>]*href="https:\/\/hentaigifz\.com\/([^\/]+)\/"/gi
    let m
    while ((m = regex.exec(html)) !== null) slugs.push(m[1])
    return [...new Set(slugs)]
  }

  function extractTotal(html) {
    const m = html.match(/(\d+)\s+gifs?\s*found/i)
    return m ? parseInt(m[1]) : 0
  }

  async function getPost(slug) {
    try {
      const html = await fetchHTML(`${BASE}/${slug}/`)

      const gifMatch = html.match(
        /<img[^>]*src="(https:\/\/cdn\.hentaigifz\.com\/(\d+)\/([^"]+\.gif))"/i
      )
      if (!gifMatch) return null

      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i)
      const title = titleMatch
        ? titleMatch[1].replace(' | Hentai Gifs', '').trim()
        : slug

      const tags = []
      const tagRe = /<a[^>]*href="https:\/\/hentaigifz\.com\/tag\/([^\/]+)\/"/gi
      let tm
      while ((tm = tagRe.exec(html)) !== null)
        tags.push(tm[1].replace(/-/g, ' '))

      return {
        id      : gifMatch[2],
        slug,
        title,
        gif_url : gifMatch[1],
        post_url: `${BASE}/${slug}/`,
        tags    : [...new Set(tags)]
      }
    } catch { return null }
  }

  app.get('/search/hentaigifz', async (req, res) => {
    try {
      const { q, page = 1, limit } = req.query
      if (!q) {
        return res.json({ status: false, error: 'Falta parámetro ?q=' })
      }

      if (!limit) {
        return res.json({ status: false, error: 'Falta parámetro ?limit=' })
      }

      const lim = Math.min(Math.max(parseInt(limit) || 10, 1), 50)
      const pg  = Math.max(parseInt(page) || 1, 1)
      const url = `${BASE}/page/${pg}/?s=${encodeURIComponent(q)}`

      const html  = await fetchHTML(url)
      const slugs = extractSlugs(html).slice(0, lim)
      const total = extractTotal(html)

      if (!slugs.length) {
        return res.json({ status: false, error: 'Sin resultados' })
      }

      const posts = await Promise.all(slugs.map(s => getPost(s)))
      const gifs  = posts.filter(Boolean)

      return res.json({
        status  : true,
        query   : q,
        fetched : gifs.length,
        result  : gifs
      })

    } catch (e) {
      res.status(500).json({ status: false, error: e.message })
    }
  })
}