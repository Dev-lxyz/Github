module.exports = function (app) {
  const axios = require('axios')

  const API = 'https://api.mangadex.org'

  app.get('/anime/manga', async (req, res) => {
    try {
      const { q, limit = 15 } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          error: 'Falta parámetro q'
        })
      }

      const { data } = await axios.get(`${API}/manga`, {
        params: {
          title: q,
          limit,
          includes: ['cover_art', 'author', 'artist'],
          contentRating: ['safe', 'suggestive', 'erotica'],
          hasAvailableChapters: true,
          order: { relevance: 'desc' }
        },
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json'
        }
      })

      if (!data?.data?.length) {
        return res.json({
          status: true,
          total: 0,
          result: []
        })
      }

      const result = await Promise.all(
        data.data.map(async (m) => {
          const cover = m.relationships.find(r => r.type === 'cover_art')
          const author = m.relationships.find(r => r.type === 'author')
          const artist = m.relationships.find(r => r.type === 'artist')

          // Obtener capítulos agregados (volúmenes + capítulos)
          const stats = await axios.get(`${API}/manga/${m.id}/aggregate`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          })

          const volumes = stats.data?.volumes || {}
          const totalVolumes = Object.keys(volumes).length

          let totalChapters = 0
          Object.values(volumes).forEach(v => {
            totalChapters += Object.keys(v.chapters || {}).length
          })

          return {
            id: m.id,
            title:
              m.attributes.title.en ||
              Object.values(m.attributes.title)[0] ||
              'Sin título',
            altTitles: m.attributes.altTitles || [],
            status: m.attributes.status || null,
            year: m.attributes.year || null,
            originalLanguage: m.attributes.originalLanguage,
            contentRating: m.attributes.contentRating,
            tags: m.attributes.tags.map(t => t.attributes.name.en),
            description:
              m.attributes.description?.en ||
              Object.values(m.attributes.description || {})[0] ||
              null,
            totalVolumes,
            totalChapters,
            author: author?.attributes?.name || null,
            artist: artist?.attributes?.name || null,
            cover: cover
              ? `https://uploads.mangadex.org/covers/${m.id}/${cover.attributes.fileName}.512.jpg`
              : null
          }
        })
      )

      res.json({
        status: true,
        total: result.length,
        result
      })

    } catch (e) {
      console.error('[MANGADEX]', e.response?.data || e.message)
      res.status(500).json({
        status: false,
        error: e.response?.data || e.message
      })
    }
  })
}