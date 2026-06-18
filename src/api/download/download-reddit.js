const axios = require("axios")
const cheerio = require("cheerio")

module.exports = function (app) {

  app.get("/download/reddit", async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro url"
        })
      }

      const ts = Date.now()

      const response = await axios.post(
        `https://redvid.io/fetch?_=${ts}`,
        {
          url,
          lang: "en"
        },
        {
          headers: {
            authority: "redvid.io",
            accept: "application/json, text/plain, */*",
            "content-type": "application/json",
            origin: "https://redvid.io",
            referer: "https://redvid.io/",
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "x-requested-with": "XMLHttpRequest"
          }
        }
      )

      const data = response.data

      if (!data?.success || !data?.view) {
        return res.status(404).json({
          status: false,
          message: "No se pudo obtener información"
        })
      }

      const $ = cheerio.load(data.view)

      const results = []

      $(".response-cinema-gallery-item").each(
        (i, el) => {
          const thumb = $(el)
            .find("img.thumbnail-image")
            .attr("src")

          const downloadBtn = $(el).find(
            'a[href*="/download?token="]'
          )

          const downloadUrl =
            downloadBtn.attr("href")

          const typeText = downloadBtn
            .text()
            .trim()

          if (downloadUrl) {
            results.push({
              item: i + 1,
              type: typeText
                .toLowerCase()
                .includes("video")
                ? "video"
                : "image",
              thumbnail: thumb || null,
              download_url: downloadUrl
            })
          }
        }
      )

      res.status(200).json({
        status: true,
        result: {
          title:
            $(".response-cinema-title")
              .text()
              .trim() || "",
          results
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