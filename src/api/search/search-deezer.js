module.exports = function (app) {
  const axios = require('axios')

  function formatDuration(seconds = 0) {
    const m = Math.floor(seconds / 60)
    const s = String(seconds % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  async function searchDeezer(query, limit = 10) {

    const { data } = await axios.get(
      'https://api.deezer.com/search/track',
      {
        params: {
          q: query,
          limit
        },
        timeout: 15000
      }
    )

    return (data.data || []).map(item => ({
      id: item.id,
      title: item.title,
      title_short: item.title_short,
      duration: item.duration + ` (${formatDuration(item.duration)})`,
      duration_ms: item.duration * 1000,
      artist: item.artist?.name || null,
      artist_id: item.artist?.id || null,
      album: item.album?.title || null,
      album_id: item.album?.id || null,
      preview: item.preview || null,
      thumbnail:
        item.album?.cover_xl ||
        item.album?.cover_big ||
        item.album?.cover_medium ||
        item.album?.cover ||
        null,

      deezer_url: item.link || null,
      rank: item.rank || 0,
      explicit:
        item.explicit_lyrics || false
    }))
  }

  app.get('/search/deezer', async (req, res) => {
    try {
      const {
        q,
        limit
      } = req.query

      if (!q) {
        return res.json({
          status: false,
          error: 'Falta parametro ?q='
        })
      }

      if (!limit) {
        return res.json({
          status: false,
          error: 'Falta parametro ?limit='
        })
      }

      const lim = Math.min(
        Math.max(parseInt(limit), 1),
        50
      )

      const result =
        await searchDeezer(q, lim)

      res.json({
        status: true,
        query: q,
        limit: lim,
        total: result.length,
        result
      })

    } catch (err) {

      res.json({
        status: false,
        error:
          err.response?.data ||
          err.message
      })

    }
  })

}