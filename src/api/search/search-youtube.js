module.exports = function (app) {
  const axios = require('axios')

  app.get('/search/yts', async (req, res) => {
    try {
      const { q } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro 'q'"
        })
      }

      const { data } = await axios.get(
        'https://www.youtube.com/results',
        {
          params: { search_query: q },
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'Accept-Language': 'es-PE,es;q=0.9'
          },
          timeout: 10000
        }
      )

      const match = data.match(/var ytInitialData = (.*?);<\/script>/)
      if (!match) throw new Error('No se pudo obtener data')

      const json = JSON.parse(match[1])

      const videos =
        json.contents
          ?.twoColumnSearchResultsRenderer
          ?.primaryContents
          ?.sectionListRenderer
          ?.contents?.[0]
          ?.itemSectionRenderer
          ?.contents || []

      const result = videos
        .filter(v => v.videoRenderer)
        .map(v => {
          const r = v.videoRenderer

          let views = r.viewCountText?.simpleText || ''
          views = views.replace(/ views?/i, '').trim()

          return {
            title: r.title?.runs?.[0]?.text || '',
            videoId: r.videoId,
            author: r.ownerText?.runs?.[0]?.text || '',
            url: 'https://youtu.be/' + r.videoId,
            duration: r.lengthText?.simpleText || '0:00',
            views: views,
            uploaded: r.publishedTimeText?.simpleText || '',
            thumbnail:
              r.thumbnail?.thumbnails?.slice(-1)[0]?.url || ''
          }
        })

      res.json({
        status: true,
        result
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })
}