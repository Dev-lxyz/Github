module.exports = function (app) {
  const axios = require('axios')

  const instance = axios.create({
    timeout: 6000,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  })

  app.get('/download/tiktokmp3', async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro 'url'"
        })
      }

      const { data } = await instance.get('https://tikwm.com/api/', {
        params: { url, hd: 1 }
      })

      if (!data || !data.data) {
        throw new Error('No se pudo obtener datos')
      }

      const r = data.data

      return res.json({
        status: true,
        data: {
          id: r.id,
          title: r.title,
          duration: r.duration,
          created_at: r.create_time,

          author: {
            nickname: r.author?.nickname,
            username: r.author?.unique_id,
            avatar: r.author?.avatar
          },

          stats: {
            plays: r.play_count,
            likes: r.digg_count,
            comments: r.comment_count,
            shares: r.share_count,
            downloads: r.download_count
          },

          dl_audio: r.music,
          cover: r.cover
        }
      })

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message
      })
    }
  })
}