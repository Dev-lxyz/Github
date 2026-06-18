module.exports = function (app) {
  const axios = require('axios')
  const cheerio = require('cheerio')

  async function fetchApps(term, limit = 5) {
    const { data } = await axios.get('https://itunes.apple.com/search', {
      params: {
        term,
        entity: 'software',
        limit,
        country: 'us' // Siempre usa US
      }
    })

    const results = []

    for (const appItem of data.results) {
      let trailer = null

      try {
        const { data: html } = await axios.get(appItem.trackViewUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          timeout: 5000
        })

        const $ = cheerio.load(html)
        $('video source').each((_, el) => {
          const src = $(el).attr('src')
          if (src?.includes('.m3u8')) trailer = src
        })
      } catch {}

      const sizeBytes = appItem.fileSizeBytes ? parseInt(appItem.fileSizeBytes) : null

      results.push({
        name: appItem.trackName,
        developer: appItem.sellerName,
        description: appItem.description,
        rating: appItem.averageUserRating ?? null,
        ratingCount: appItem.userRatingCount ?? 0,
        version: appItem.version,
        bundleId: appItem.bundleId,
        price: appItem.formattedPrice,
        currency: appItem.currency,
        size_bytes: sizeBytes,
        size_mb: sizeBytes ? (sizeBytes / 1024 / 1024).toFixed(2) : null,
        minimum_ios: appItem.minimumOsVersion,
        genre: appItem.primaryGenreName,
        released: appItem.currentVersionReleaseDate,
        url: appItem.trackViewUrl,
        artwork: appItem.artworkUrl512,
        trailer_m3u8: trailer
      })
    }

    return results
  }

  app.get('/search/appstore', async (req, res) => {
    try {
      const { q, limit } = req.query
      if (!q) return res.status(400).json({ status: false, error: 'Missing parameter ?q=' })

      const apps = await fetchApps(q, parseInt(limit) || 5)

      return res.json({
        status: true,
        query: q,
        total_results: apps.length,
        results: apps
      })
    } catch (err) {
      return res.status(500).json({ status: false, error: err.message })
    }
  })
}