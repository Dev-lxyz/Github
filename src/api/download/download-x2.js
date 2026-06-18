module.exports = function (app) {
  const {
    twitterDescargar,
    twitterInfo,
    twitterVideoUrl
  } = require('../../lib/x.js')

  app.get('/download/twitter', async (req, res) => {
    try {
      const { url, type } = req.query

      if (!url) {
        return res.json({
          status: false,
          error: "Falta parámetro: ?url="
        })
      }

      if (type === 'info') {
        const data = await twitterInfo(url)
        return res.json({
          status: true,
          result: data
        })
      }

      if (type === 'url') {
        const video = await twitterVideoUrl(url)
        return res.json({
          status: true,
          result: video
        })
      }

      const data = await twitterDescargar(url)

      res.json({
        status: true,
        result: {
          id: data.id,
          texto: data.texto,
          autor: data.autor,
          nombre: data.nombre,
          likes: data.likes,
          retweets: data.retweets,
          replies: data.replies,
          vistas: data.vistas,
          fecha: data.fecha,
          tieneVideo: data.tieneVideo,
          videos: data.videos.map(v => ({
            bitrate: v.bitrate,
            duracionMs: v.duracionMs,
            size: v.buffer.length
          }))
        }
      })

    } catch (e) {
      res.json({
        status: false,
        error: e.message
      })
    }
  })
}