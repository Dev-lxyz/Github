const axios = require('axios')
const cheerio = require('cheerio')

module.exports = function (app) {

  const UA = 'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'

  async function phSearch(query, limit = 10) {
    const { data } = await axios.get(
      `https://www.pornhub.com/video/search?search=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000
      }
    )

    const $ = cheerio.load(data)
    const results = []

    $('li[data-video-vkey]').each((_, el) => {
      if (results.length >= limit) return false

      const anchor = $(el).find('a.imageLink').first()
      const img = $(el).find('img.videoThumb').first()

      const href = anchor.attr('href') || ''
      const title = $(el).find('.title a').first().text().trim()
      const thumb = img.attr('src') || ''
      const preview = anchor.attr('data-webm') || ''
      const duration = $(el).find('.duration').first().text().trim()
      const vkey = $(el).attr('data-video-vkey') || ''

      if (!title || !href) return

      results.push({
        title,
        url: href.startsWith('http') ? href : `https://www.pornhub.com${href}`,
        thumbnail: thumb,
        preview,
        duration,
        id: vkey
      })
    })

    return results
  }

  app.get('/nsfw/search/pornhub', async (req, res) => {
    try {
      const { q, limit = 10 } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          error: 'Falta parámetro "q"'
        })
      }

      const results = await phSearch(q, parseInt(limit) || 10)

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