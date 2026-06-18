module.exports = function (app) {
  const axios = require('axios')

  const BASE_URL = 'https://gelbooru.com/index.php'

  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://gelbooru.com/',
    'Origin': 'https://gelbooru.com'
  }

  async function searchGelbooru(query, limit = 10) {
    if (!query) throw new Error('Query requerida')

    const url = `${BASE_URL}?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(query)}&api_key=f965be362e70972902e69652a472b8b2df2c5d876cee2dc9aebc7d5935d128db98e9f30ea4f1a7d497e762f8a82f132da65bc4e56b6add0f6283eb9b16974a1a&user_id=1862243&limit=${limit}`

    const { data } = await axios.get(url, {
      headers: HEADERS,
      timeout: 10000
    })

    const posts = data?.post || []

    if (!posts.length) throw new Error('Sin resultados')

    return posts.map(post => ({
      id: post.id,
      tags: post.tags,
      image: post.file_url,
      preview: post.preview_url,
      width: post.width,
      height: post.height,
      rating: post.rating,
      source: post.source || null
    }))
  }

  // 🔥 endpoint
  app.get('/search/gelbooru', async (req, res) => {
    try {
      const { q, limit = 10 } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          message: 'Falta ?q='
        })
      }

      const parsedLimit = Math.min(parseInt(limit) || 10, 100)

      const data = await searchGelbooru(q, parsedLimit)

      return res.json({
        status: true,
        creator: "shadow.xyz",
        total: data.length,
        data
      })

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message || 'Error interno'
      })
    }
  })
}