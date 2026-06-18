module.exports = function (app) {
  const axios = require("axios")
  const cheerio = require("cheerio")

  app.get("/download/fdroid", async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro ?url="
        })
      }

      const page = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      })

      const $ = cheerio.load(page.data)

      const name = $("h3.package-name").first().text().trim()
      const description = $("div.package-summary").first().text().trim()
      const iconRaw = $("img.package-icon").attr("src")
      const license = $("span.package-license").text().trim()
      const author = $("a.package-author").text().trim()

      const versionBox = $("li.package-version#latest")
      let apkUrl = versionBox.find(".package-version-download a").attr("href")

      if (!apkUrl) {
        return res.status(404).json({
          status: false,
          message: "APK no encontrado"
        })
      }

      if (!apkUrl.startsWith("http")) {
        apkUrl = "https://f-droid.org" + apkUrl
      }

      const head = await axios.head(apkUrl)
      const bytes = Number(head.headers["content-length"] || 0)
      const sizeMB = (bytes / 1048576).toFixed(2) + " MB"

      res.json({
        status: true,
        data: {
          name,
          description,
          author,
          license,
          icon: iconRaw
          ? iconRaw.startsWith("http")
            ? iconRaw
            : "https://f-droid.org" + iconRaw
          : null,
          page: url,
          size: sizeMB,
          download: apkUrl
        }
      })

    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message
      })
    }
  })
}