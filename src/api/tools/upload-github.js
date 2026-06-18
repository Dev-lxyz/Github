const axios = require("axios")
const path = require("path")
const crypto = require("crypto")

module.exports = function(app) {

  const CONFIG = {
    token: "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",
    user: "Dev-lxyz",
    repo: "upload"
  }

  function randomName(ext = ".bin") {
    return crypto.randomBytes(2).toString("hex").toUpperCase() + ext
  }

  function formatSize(bytes) {

    if (!bytes) return "0 KB"

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  async function uploadToGithub(url) {

    const file = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 60000,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    })

    const contentType =
      file.headers["content-type"] || ""

    let ext =
      path.extname(
        new URL(url).pathname
      ).split("?")[0]

    if (!ext) {

      if (contentType.includes("mp4")) ext = ".mp4"
      else if (contentType.includes("mpeg")) ext = ".mp3"
      else if (contentType.includes("png")) ext = ".png"
      else if (contentType.includes("jpeg")) ext = ".jpg"
      else if (contentType.includes("gif")) ext = ".gif"
      else if (contentType.includes("webp")) ext = ".webp"
      else ext = ".bin"
    }

    const fileName = randomName(ext)

    const githubUrl =
      `https://api.github.com/repos/${CONFIG.user}/${CONFIG.repo}/contents/${fileName}`

    const upload = await axios.put(
      githubUrl,
      {
        message: `Upload ${fileName}`,
        content: Buffer.from(file.data).toString("base64")
      },
      {
        headers: {
          Authorization: `token ${CONFIG.token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Mozilla/5.0"
        },
        timeout: 60000
      }
    )

    return {
      name: fileName,
      size: formatSize(file.data.length),
      mime: contentType,
      url: upload.data.content.download_url
    }
  }

  app.get("/tools/github-upload", async (req, res) => {
    try {

      const { urls } = req.query

      if (!urls) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro urls"
        })
      }

      const list = urls
        .split(",")
        .map(v => v.trim())
        .filter(Boolean)

      if (list.length > 10) {
        return res.status(400).json({
          status: false,
          message: "Máximo 10 URLs"
        })
      }

      const results = []

      for (const url of list) {

        try {

          const uploaded =
            await uploadToGithub(url)

          results.push({
            status: true,
            original: url,
            result: uploaded
          })

        } catch (e) {

          results.push({
            status: false,
            original: url,
            error: e.message
          })

        }
      }

      return res.json({
        status: true,
        total: results.length,
        results
      })

    } catch (e) {

      return res.status(500).json({
        status: false,
        message: e.message
      })

    }
  })

}