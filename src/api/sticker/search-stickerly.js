const axios = require('axios')
const { createApiKeyMiddleware } = require('./../../lib/apikey.js')

module.exports = function (app) {

  app.get('/sticker/search/stickerly', createApiKeyMiddleware(),async (req, res) => {
    try {
      const { query } = req.query

      if (!query) {
        return res.status(400).json({
          status: false,
          message: 'Falta el parámetro ?query='
        })
      }

      const response = await axios.post(
        'https://api.sticker.ly/v4/stickerPack/smartSearch',
        {
          keyword: query,
          enabledKeywordSearch: true,
          filter: {
            extendSearchResult: false,
            sortBy: 'RECOMMENDED',
            languages: ['ALL'],
            minStickerCount: 5,
            searchBy: 'ALL',
            stickerType: 'ALL',
          },
        },
        {
          headers: {
            'user-agent': 'androidapp.stickerly/3.17.0 (Android 10)',
            'content-type': 'application/json',
            'accept-encoding': 'gzip',
          },
          timeout: 15000
        }
      )

      if (response.status !== 200) {
        return res.status(500).json({
          status: false,
          message: 'Error al consultar Sticker.ly'
        })
      }

      const body = response.data

      if (body.error) {
        return res.status(500).json({
          status: false,
          message: body.error.errorMessage || 'Sticker.ly error'
        })
      }

      if (!body.result || !body.result.stickerPacks) {
        return res.json({
          status: true,
          total: 0,
          result: []
        })
      }

      const result = body.result.stickerPacks.map(pack => ({
        id: pack.shareUrl.replace('https://sticker.ly/s/', ''),
        name: pack.name,
        author: pack.authorName,
        stickerCount: pack.resourceFiles.length,
        viewCount: pack.viewCount,
        exportCount: pack.exportCount,
        isPaid: pack.isPaid,
        isAnimated: pack.isAnimated,
        thumbnail: `${pack.resourceUrlPrefix}${pack.resourceFiles[pack.trayIndex]}`,
        url: pack.shareUrl
      }))

      return res.json({
        status: true,
        total: result.length,
        result
      })

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message
      })
    }
  })

}