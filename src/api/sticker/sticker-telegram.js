module.exports = function (app) {
  const axios = require('axios')

  const BOT_TOKEN = '8215874999:AAGE83FQCc9b2A7MyAX2DHlK_VjnOoD322A' // token .-.

  function getPackName(url) {
    const match = url.match(/addstickers\/([^/?]+)/)
    return match ? match[1] : null
  }

  app.get('/sticker/telegram', async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          error: 'Falta "url"'
        })
      }

      const pack = getPackName(url)
      if (!pack) {
        return res.status(400).json({
          status: false,
          error: 'URL inválida'
        })
      }
      const { data } = await axios.get(
        `https://api.telegram.org/bot${BOT_TOKEN}/getStickerSet`,
        { params: { name: pack } }
      )

      if (!data.ok || !data.result.stickers.length) {
        throw new Error('Pack vacío o no encontrado')
      }

      const results = await Promise.all(
        data.result.stickers.map(async (s) => {
          const file = await axios.get(
            `https://api.telegram.org/bot${BOT_TOKEN}/getFile`,
            { params: { file_id: s.file_id } }
          )

          const filePath = file.data.result.file_path

          return {
            file_id: s.file_id,
            emoji: s.emoji || '',
            type: s.is_animated
              ? 'animated'
              : s.is_video
              ? 'video'
              : 'image',
            url: `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`
          }
        })
      )

      res.json({
        status: true,
        pack: data.result.title,
        total: results.length,
        result: results
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })
}