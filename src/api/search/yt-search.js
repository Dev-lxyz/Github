module.exports = function (app) {
  const axios = require('axios')

  const instance = axios.create({
    timeout: 6000,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept-Language': 'es-PE,es;q=0.9'
    }
  })

  app.get('/search/yt-search', async (req, res) => {
    try {
      const { q } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro 'q'"
        })
      }

      const { data } = await instance.get(
        'https://www.youtube.com/results',
        { params: { search_query: q } }
      )

      const match = data.match(/var ytInitialData = (.*?);<\/script>/)
      if (!match) throw new Error('No se pudo obtener data')

      const json = JSON.parse(match[1])

      const contents =
        json.contents
          ?.twoColumnSearchResultsRenderer
          ?.primaryContents
          ?.sectionListRenderer
          ?.contents?.[0]
          ?.itemSectionRenderer
          ?.contents || []

      const first = contents.find(v => v.videoRenderer)
      if (!first) throw new Error('No se encontraron resultados')

      const r = first.videoRenderer

      let views = r.viewCountText?.simpleText || ''
      views = views.replace(/ views?/i, '').trim()

      return res.json({
        status: true,
        result: {
          title: r.title?.runs?.[0]?.text || '',
          videoId: r.videoId,
          author: r.ownerText?.runs?.[0]?.text || '',
          url: 'https://youtu.be/' + r.videoId,
          duration: r.lengthText?.simpleText || '0:00',
          views,
          uploaded: r.publishedTimeText?.simpleText || '',
          thumbnail: r.thumbnail?.thumbnails?.slice(-1)[0]?.url || ''
        }
      })

    } catch (e) {
      return res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })
}