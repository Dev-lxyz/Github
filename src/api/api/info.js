const path = require("path")
const fs = require("fs")

module.exports = function (app) {

  const settingsPath = path.resolve(
    __dirname,
    "../../settings.json"
  )

  const settings = JSON.parse(
    fs.readFileSync(settingsPath, "utf8")
  )

  const apiStartTime = Date.now()

  let totalRoutes = 0
  let totalEndpoints = 0

  function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400)
    seconds %= 86400

    const h = Math.floor(seconds / 3600)
    seconds %= 3600

    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)

    return `${d}D ${h}H ${m}M ${s}S`
  }

  function gb(bytes) {
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB"
  }

  async function getApiInfo() {

    const start = Date.now()

    await new Promise(resolve =>
      setTimeout(resolve, 1)
    )

    const latency = Date.now() - start

    const uptimeSeconds = Math.floor(
      (Date.now() - apiStartTime) / 1000
    )

    const mem = process.memoryUsage()

    let disk = {
      total: "unknown",
      used: "unknown",
      free: "unknown",
      usage: "unknown"
    }

    try {

      const stat = fs.statfsSync(
        process.cwd()
      )

      const total = stat.blocks * stat.bsize
      const free = stat.bavail * stat.bsize
      const used = total - free

      disk = {
        total: gb(total),
        used: gb(used),
        free: gb(free),
        usage:
          ((used / total) * 100).toFixed(2) + "%"
      }

    } catch {}

    return {
      creator: settings?.apiSettings?.creator || "unknown",
      version: settings?.version || "unknown",
      uptime: formatUptime(uptimeSeconds),
      latency: `${latency}ms`,
      routers: totalRoutes,
      endpoints: totalEndpoints,
      limit: settings?.apiSettings?.limit || 0,

      process: {
        pid: process.pid,
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: `${Math.floor(process.uptime())}s`,
        title: process.title
      },

      ram: {
        rss: gb(mem.rss),
        heapTotal: gb(mem.heapTotal),
        heapUsed: gb(mem.heapUsed),
        external: gb(mem.external),
        arrayBuffers: gb(
          mem.arrayBuffers || 0
        ),
        usage:
          mem.heapTotal > 0
            ? (
                (
                  mem.heapUsed /
                  mem.heapTotal
                ) * 100
              ).toFixed(2) + "%"
            : "0%"
      },

      disk,

      status: {
        online: true,
        memoryLeak:
          mem.heapUsed >
          mem.heapTotal * 0.9,
        timestamp: Date.now()
      }
    }
  }

  app._router?.stack?.forEach(layer => {

    if (layer.route) {

      totalRoutes++

      const methods = Object.keys(
        layer.route.methods
      )

      totalEndpoints += methods.length

    }

  })

  app.get("/api/info", async (req, res) => {
      try {
        const info = await getApiInfo()
        res.json({
          status: true,
          data: info
        })

      } catch (err) {

        res.status(500).json({
          status: false,
          error: err.message
        })

      }

    }
  )

}