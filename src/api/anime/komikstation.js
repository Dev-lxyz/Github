const KomikStation = require("../../lib/komi")

module.exports = function (app) {
  const komik = new KomikStation()

  // SEARCH
  app.get("/anime/search/komikstation", async (req, res) => {
    try {
      const { q } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro q"
        })
      }

      const result = await komik.search(q)

      res.json({
        status: true,
        ...result
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

  // TRENDING
  app.get("/anime/trending/komikstation", async (req, res) => {
    try {
      const result = await komik.trending()

      res.json({
        status: true,
        ...result
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

  // DETAIL
  app.get("/anime/detail/komikstation", async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro url"
        })
      }

      const result = await komik.detail(url)

      res.json({
        status: true,
        ...result
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

  // READ CHAPTER
  app.get("/anime/read/komikstation", async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro url"
        })
      }

      const result = await komik.read(url)

      res.json({
        status: true,
        ...result
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

  // DOWNLOAD CHAPTER
  app.get("/anime/download/komikstation", async (req, res) => {
    try {
      const { url, outdir } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro url"
        })
      }

      const result = await komik.download(
        url,
        outdir || "./downloads"
      )

      res.json({
        status: true,
        ...result
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

  // DIRECT DOWNLOAD
  app.get("/anime/direct/komikstation", async (req, res) => {
    try {
      const { url, filename, outdir } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro url"
        })
      }

      const result = await komik.downloadDirect(
        url,
        outdir || "./downloads",
        filename || null
      )

      res.json({
        status: true,
        ...result
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

  // DOWNLOAD ALL
  app.get("/anime/downloadall/komikstation", async (req, res) => {
    try {
      const { url, limit, outdir } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro url"
        })
      }

      const result = await komik.downloadAllDirect(
        url,
        outdir || "./downloads",
        limit ? Number(limit) : null
      )

      res.json({
        status: true,
        ...result
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}