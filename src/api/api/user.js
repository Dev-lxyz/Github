module.exports = function (app) {
  const fs = require('fs')
  const path = require('path')

  app.get('/api/status-user', (req, res) => {
    try {
      const ip =
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.socket.remoteAddress ||
        'unknown'

      const currentDate = new Date().toISOString().split('T')[0]
      const dbPath = path.join(process.cwd(), './src/database.json')
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))

      const user = db.users?.[ip]
      const settingsPath = path.join(process.cwd(), './src/settings.json')
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      const limit = settings?.apiSettings?.limit || 10005
      const used = user?.count || 0
      const remaining = Math.max(limit - used, 0)

      res.json({
        status: true,
        data: {
          date: currentDate,
          limit,
          used,
          remaining,
          percent_used: ((used / limit) * 100).toFixed(2) + "%",
          blocked: used >= limit
        }
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })
}