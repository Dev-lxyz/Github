const axios = require('axios')
const http = require('http')
const https = require('https')

module.exports = function (app) {

  const api = axios.create({
    timeout: 5000,
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true })
  })

  app.get('/search/aptoide', async (req, res) => {
    try {
      const { q } = req.query
      if (!q) {
        return res.status(400).json({
          status: false,
          error: 'Falta parámetro q'
        })
      }

      const { data } = await api.get(
        'https://ws75.aptoide.com/api/7/apps/search',
        {
          params: {
            query: q,
            limit: 1
          }
        }
      )

      const appData = data?.datalist?.list?.[0]

      if (!appData) {
        return res.status(404).json({
          status: false,
          error: 'No se encontró la app'
        })
      }

      return res.json({
        status: true,
        data: {
          name: appData.name,
          package: appData.package,
          developer: appData.developer?.name,
          version: appData.file?.vername,
          version_code: appData.file?.vercode,
          size: (appData.size / 1024 / 1024).toFixed(2) + ' MB',
          downloads: appData.stats?.downloads,
          rating: appData.stats?.rating?.avg,
          rating_total: appData.stats?.rating?.total,
          icon: appData.icon,
          graphic: appData.graphic,
          description: appData.media?.description,
          lastUpdate: appData.updated,
          download_url: appData.file?.path
        }
      })

    } catch (err) {
      return res.status(500).json({
        status: false,
        error: err.message
      })
    }
  })

}