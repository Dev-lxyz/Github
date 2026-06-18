/*
const axios = require("axios")

module.exports = function (app) {

  async function ytdl(url, format = "mp3") {
    try {
      const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
      const match = url.match(regex)

      if (!match || !match[1]) {
        throw new Error("URL de YouTube inválida")
      }

      const client = axios.create({
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 16; NX729J) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7271.123 Mobile Safari/537.36",
          "Referer": "https://id.ytmp3.mobi/"
        },
        timeout: 30000
      })

      const { data: init } = await client.get(
        "https://d.ymcdn.org/api/v1/init",
        {
          params: {
            p: "y",
            "23": "1llum1n471",
            _: Math.random()
          }
        }
      )

      if (!init.convertURL) {
        throw new Error("No se pudo iniciar el servidor")
      }

      const { data: convert } = await client.get(
        init.convertURL,
        {
          params: {
            v: match[1],
            f: format,
            _: Math.random()
          }
        }
      )

      let progress = 0
      let title = ""
      let attempts = 0
      const maxAttempts = 20

      while (progress < 3 && attempts < maxAttempts) {

        const { data } = await client.get(convert.progressURL)

        if (data.error > 0) {
          throw new Error(`Error del servidor: ${data.error}`)
        }

        progress = data.progress
        title = data.title

        if (progress < 3) {
          attempts++
          await new Promise(r => setTimeout(r, 250))
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error("Tiempo de espera agotado")
      }

      return {
        status: true,
        data: {
          title, 
          format,
          dl: convert.downloadURL
        }
      }

    } catch (e) {

      return {
        status: false,
        message: e.message
      }

    }
  }

  app.get("/download/ytmp4", async (req, res) => {
    try {
      const {
        url,
        format = "mp4"
      } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro url"
        })
      }

      if (!["mp3", "mp4"].includes(format)) {
        return res.status(400).json({
          status: false,
          message: "Formato válido: mp3 o mp4"
        })
      }

      const result = await ytdl(url, format)
      return res.json(result)
    } catch (e) {

      return res.status(500).json({
        status: false,
        message: e.message
      })

    }
  })

}
*/module.exports = function (app) {

  const axios = require('axios')
  const CONFIG = {
    audio: { ext: ["mp3", "m4a", "wav", "opus", "flac"], q: ["best", "320k", "128k"] },
    video: { ext: ["mp4"], q: ["144p", "240p", "360p", "480p", "720p", "1080p"] }
  }

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0 (Android)",
    referer: "https://ytmp3.gg/"
  }

  const poll = async (statusUrl) => {
    try {
      const { data } = await axios.get(statusUrl, { headers })
      if (data.status === "completed") return data
      if (data.status === "failed") throw new Error(data.message || "Conversion failed")

      await new Promise(r => setTimeout(r, 2000))
      return poll(statusUrl)
    } catch (err) {
      throw new Error(`Polling failed: ${err.message}`)
    }
  }

  async function convertYouTube(url, format = "mp3", quality = "128k") {
    try {
      const type = Object.keys(CONFIG).find(k => CONFIG[k].ext.includes(format))
      if (!type) throw new Error(`Unsupported format: ${format}`)

      const allowedQualities = CONFIG[type].q
      if (!allowedQualities.includes(quality)) {
        throw new Error(`Invalid quality for ${type}. Choose: ${allowedQualities.join(", ")}`)
      }

      // Get basic metadata via oEmbed (reliable & fast)
      const { data: meta } = await axios.get("https://www.youtube.com/oembed", {
        params: { url, format: "json" }
      })

      const payload = {
        url,
        os: "android",
        output: {
          type,
          format,
          ...(type === "video" && { quality })
        },
        ...(type === "audio" && { audio: { bitrate: quality } })
      }

      // Try hub → fallback to api subdomain
      let downloadInit
      try {
        downloadInit = await axios.post("https://hub.ytconvert.org/api/download", payload, { headers })
      } catch {
        downloadInit = await axios.post("https://api.ytconvert.org/api/download", payload, { headers })
      }

      const { data: initData } = downloadInit
      if (!initData?.statusUrl) {
        throw new Error("No status URL received from converter")
      }

      const result = await poll(initData.statusUrl)

      return {
        title: meta.title,
        author: meta.author_name,
        duration: meta.duration || result.duration || "Unknown",
        thumbnail: meta.thumbnail_url || null,
        downloadUrl: result.downloadUrl,
        format,
        quality,
        filename: `${meta.title.replace(/[^\w\s-]/gi, '')}.${format}`
      }
    } catch (err) {
      return {
        status: false,
        message: err.message || "Failed to retrieve file"
      }
    }
  }

  async function ytmp3(url) {
    if (!url) return { status: false, message: "YouTube URL is required" }

    const result = await convertYouTube(url, "mp3", "128k")
    if (result.status === false) return result

    return {
      status: true,
      title: result.title,
      channel: result.author,
      duration: result.duration,
      thumbnail: result.thumbnail,
      downloadUrl: result.downloadUrl,
      filename: result.filename,
      quality: "128kbps"
    }
  }

  async function ytmp4(url, quality = "720p") {
    if (!url) return { status: false, message: "YouTube URL is required" }

    const result = await convertYouTube(url, "mp4", quality)
    if (result.status === false) return result

    return {
      status: true,
      data: {
        title: result.title,
        channel: result.author,
        duration: result.duration,
        thumbnail: result.thumbnail,
        dl: result.downloadUrl,
        quality_list: {
          [quality]: {
            resolution: quality,
            size: "Unknown",
            url: result.downloadUrl
          }
        },
        filename: result.filename
      }
    }
  }

  app.get('/download/ytmp3-v2', async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.json({ status: false, error: "Falta parametro ?url=" })
      }

      const result = await ytmp3(url)
      res.json(result)

    } catch (err) {
      res.json({ status: false, error: err.message })
    }
  })

  app.get('/download/ytmp4', async (req, res) => {
    try {
      const { url, quality } = req.query

      if (!url) {
        return res.json({ status: false, error: "Falta parametro ?url=" })
      }

      const result = await ytmp4(url, quality || "720p")
      res.json(result)

    } catch (err) {
      res.json({ status: false, error: err.message })
    }
  })

}
