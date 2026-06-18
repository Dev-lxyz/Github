const axios = require("axios")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

module.exports = function (app) {
  const cache = new Map()
  const CACHE_TTL = 1000 * 60 * 2

  async function spotifyDownload(url) {
    if (cache.has(url)) {
      const cached = cache.get(url)
      if (Date.now() < cached.expire) return cached.data
      cache.delete(url)
    }

    const { data } = await axios.post(
      "https://gamepvz.com/api/download/get-url",
      { url },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        timeout: 20000
      }
    )

    if (data.code !== 200) {
      throw new Error(data.message || "failed to download")
    }

    const b64 = new URLSearchParams(
      data.originalVideoUrl.split("?")[1]
    ).get("url")

    const directUrl = Buffer.from(b64, "base64").toString("utf8")

    const result = {
      title: data.title || null,
      artist: data.authorName || null,
      cover: data.coverUrl || null,
      download: directUrl
    }

    cache.set(url, {
      data: result,
      expire: Date.now() + CACHE_TTL
    })

    return result
  }

  // DESCARGA + GUARDA EN /files
  app.get("/download/spotify/v3", async (req, res) => {
    try {
      const { url } = req.query
      if (!url) {
        return res.json({ status: false, error: "falta parametro ?url=" })
      }

      const result = await spotifyDownload(url)

      if (!result.download) {
        return res.json({ status: false, error: "no download url" })
      }

      const file = await axios.get(result.download, {
        responseType: "arraybuffer"
      })

      const ext = path.extname(result.download.split("?")[0]) || ".mp3"
      const id = crypto.randomBytes(10).toString("hex") // SOLO ID (20 chars aprox)
      const name = id + ext

      const dir = path.join(process.cwd(), "files")
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      const filePath = path.join(dir, name)
      fs.writeFileSync(filePath, file.data)

      res.json({
        status: true,
        data: {
          title: result.title,
          artist: result.artist,
         // cover: result.cover,
          id: id,
          dl: `${req.protocol}://${req.get("host")}/files/${id}`
        }
      })

    } catch (err) {
      res.json({
        status: false,
        error: err.response?.data || err.message
      })
    }
  })

  // SERVIDOR DE ARCHIVOS SIN EXTENSIÓN EN URL
  app.get("/files/:id", (req, res) => {
    try {
      const dir = path.join(process.cwd(), "files")

      const file = fs.readdirSync(dir).find(f =>
        f.startsWith(req.params.id)
      )

      if (!file) {
        return res.status(404).json({
          status: false,
          error: "file not found"
        })
      }

      res.sendFile(path.join(dir, file))
    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })
}