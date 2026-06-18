const axios = require("axios")

module.exports = function(app) {
  app.get("/search/npm", async (req, res) => {
    try {
      const q = req.query.q || req.body?.q
      const sizeLimit = parseInt(req.query.size || req.body?.size) || 50  // cuántos resultados traer
      if (!q) return res.status(400).json({ status: false, error: "Query 'q' is required" })

      // La API de npm search (max 250 por request)
      const maxSize = Math.min(sizeLimit, 250)

      const { data } = await axios.get("https://registry.npmjs.org/-/v1/search", {
        params: {
          text: q,
          size: maxSize,
          quality: 0.65,
          popularity: 0.98,
          maintenance: 0.95
        }
      })

      const results = await Promise.all(data.objects.map(async obj => {
        const pkg = obj.package

        // Obtener metadata completa del paquete (para size)
        let pkgSizeMB = null
        try {
          const meta = await axios.get(`https://registry.npmjs.org/${pkg.name}`)
          // size en bytes (latest version)
          const latestVersion = meta.data["dist-tags"].latest
          const dist = meta.data.versions[latestVersion].dist
          if (dist && dist.unpackedSize) {
            pkgSizeMB = (dist.unpackedSize / 1024 / 1024).toFixed(2) // MB
          }
        } catch (e) {
          pkgSizeMB = null
        }

        return {
          name: pkg.name,
          version: pkg.version,
          description: pkg.description,
          date: pkg.date,
          sizeMB: pkgSizeMB,
          keywords: pkg.keywords || [],
          links: pkg.links
        }
      }))

      res.json({
        status: true,
        total: data.total,
        requested: maxSize,
        results
      })
    } catch (e) {
      res.status(500).json({ status: false, error: e.message })
    }
  })
}