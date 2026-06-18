module.exports = function (app) {
  const axios = require("axios")
  const cheerio = require("cheerio")

  async function fbPhotoDownload(videoUrl) {
    if (!videoUrl) throw Error("URL no puede estar vacía")

    const headers = {
      "accept": "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "content-type": "application/x-www-form-urlencoded",
      "hx-current-url": "https://fget.io/download-facebook-photo",
      "hx-request": "true",
      "hx-target": "target",
      "hx-trigger": "form",
      "origin": "https://fget.io",
      "referer": "https://fget.io/download-facebook-photo",
      "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"
    }

    const body = new URLSearchParams()
    body.append("id", videoUrl)
    body.append("locale", "en")

    const res = await axios.post(
      "https://fget.io/process",
      body.toString(),
      { headers }
    )

    const html = res.data
    const $ = cheerio.load(html)

    const thumbnail = $(".result-thumbnail img").attr("src") || null
    const title = $(".result-title").text().trim() || "Facebook Photo"
    const downloadUrl = $("a[download]").attr("href") || null
    const filename = $("a[download]").attr("download") || null

    if (!downloadUrl) {
      throw Error("No se pudo obtener el link de descarga")
    }

    return {
      code: 200,
      timestamp: Date.now(),
      data: {
        title,
        thumbnail,
        download_url: downloadUrl,
        filename,
        type: "photo"
      }
    }
  }

  app.get("/download/facebook-photo", async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro url"
        })
      }

      const result = await fbPhotoDownload(url)

      res.json(result)

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}