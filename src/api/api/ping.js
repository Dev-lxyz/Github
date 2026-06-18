module.exports = function (app) {
  const si = require('systeminformation')

  let requestCount = 0

  app.use((req, res, next) => {
    requestCount++
    next()
  })

  app.get('/api/ping', async (req, res) => {
    const start = Date.now()
    try {
      const [cpu, mem, osInfo] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.osInfo()
      ])

      const pingMs = Date.now() - start || 29 // simular rápido

      res.json({
        status: true,
        data: {
          ping: `${pingMs}ms`,
          timestamp: new Date().toISOString(),
          requests: requestCount,
          route: req.originalUrl,
          method: req.method,
          system: {
            platform: osInfo.platform,
            distro: osInfo.distro,
            release: osInfo.release,
            arch: osInfo.arch,
            cpus: cpu.cores,
            cpuModel: cpu.brand,
            memory: `${Math.round(mem.total / 1024 / 1024)} MB`
          }
        }
      })
    } catch (err) {
      res.status(500).json({
        status: false,
        data: {
          ping: "0ms",
          timestamp: new Date().toISOString(),
          error: err.message || "Error desconocido",
          route: req.originalUrl,
          method: req.method,
          requests: requestCount
        }
      })
    }
  })
}