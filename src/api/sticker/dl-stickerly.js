const axios = require('axios')

module.exports = function (app) {

  const BASE = 'https://api.sticker.ly'

  const headers = {
    'user-agent': 'androidapp.stickerly/3.17.0 (Redmi Note 4; U; Android 29)',
    'content-type': 'application/json',
  }

  // 🔥 formato 12989 → 12.899
  function formatNumber(n) {
    if (!n) return 0
    return Number(n).toLocaleString('es-PE')
  }

  app.get('/sticker/download/stickerly', async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: 'Falta parametro ?url='
        })
      }

      const match = url.match(/^https?:\/\/(www\.)?sticker\.ly\/s\/([A-Za-z0-9]{5,})\/?$/)
      if (!match) {
        return res.status(400).json({
          status: false,
          message: 'Invalid sticker.ly URL'
        })
      }

      const packId = match[2]

      const { data } = await axios.get(
        `${BASE}/v4/stickerPack/${packId}?needRelation=true`,
        {
          headers,
          timeout: 8000
        }
      )

      if (!data?.result) {
        return res.status(404).json({
          status: false,
          message: data?.error?.errorMessage || 'Sticker pack not found'
        })
      }

      const pack = data.result

      const stickers = (pack.stickers || [])
        .filter(s => s.fileName)
        .map(s => pack.resourceUrlPrefix + s.fileName)

      const now = new Date()

      return res.json({
        status: true,
        data: {
          id: packId,
          name: pack.name,
          author: pack?.user?.displayName || pack?.authorName || '',
          followers: formatNumber(pack?.user?.followerCount || 0),
          animated: pack.isAnimated,
          isPaid: pack.isPaid,
          views: formatNumber(pack.viewCount),
          exports: formatNumber(pack.exportCount),
          stickerCount: stickers.length,
          thumbnail: pack.resourceUrlPrefix + pack.resourceFiles?.[pack.trayIndex],
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0]
        },
        stickers
      })

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message
      })
    }
  })

}