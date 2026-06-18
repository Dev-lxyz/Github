const fs = require('fs')
const path = require('path')

module.exports = function (app) {

  async function getTopEndpoints(limit = 10) {

    const dbPath = path.join(
      __dirname,
      '../../database.json'
    )

    if (!fs.existsSync(dbPath)) {
      throw new Error(
        'No existe database.json'
      )
    }

    const json = JSON.parse(
      fs.readFileSync(dbPath)
    )

    const endpoints =
      json.endpoints || {}

    const ignore = [
      '/docs',
      '/status-page',
      '/status',
      '/favicon.ico',
      '/src/preview.png'
    ]

    const clean = {}

    for (const key in endpoints) {

      const route =
        key.split('?')[0]

      if (ignore.includes(route))
        continue

      const data = endpoints[key]

      if (!clean[route]) {
        clean[route] = {
          count: 0,
          errors: 0,
          ms: 0,
          hits: 0,
          status: 200
        }
      }

      clean[route].count +=
        data.count || 0

      clean[route].errors +=
        data.errors || 0

      clean[route].ms +=
        data.ms || 0

      clean[route].hits++

      if ((data.status || 200) >= 400) {
        clean[route].status = 500
      }
    }

    return Object.entries(clean)
      .map(([router, data]) => ({
        router,
        count: data.count,
        errors: data.errors,
        ms: Math.floor(
          data.ms / data.hits
        ),
        status: data.status
      }))
      .sort((a, b) =>
        b.count - a.count
      )
      .slice(0, limit)
  }

  // GET
  app.get('/api/top-endpoints', async (req, res) => {
    try {

      const limit =
        Number(req.query.limit) || 10

      const top =
        await getTopEndpoints(limit)

      res.json({
        status: true,
        method: 'GET',
        total: top.length,
        limit,
        top
      })

    } catch (err) {

      res.status(500).json({
        status: false,
        error: err.message
      })

    }
  })

  // POST
  app.post('/api/top-endpoints', async (req, res) => {
    try {

      const limit =
        Number(req.body?.limit) || 10

      const top =
        await getTopEndpoints(limit)

      res.json({
        status: true,
        method: 'POST',
        total: top.length,
        limit,
        top
      })

    } catch (err) {

      res.status(500).json({
        status: false,
        error: err.message
      })

    }
  })

}