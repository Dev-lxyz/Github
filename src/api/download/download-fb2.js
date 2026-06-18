
// IA actuliza el endpoint si funciona pero quiero que devuelva más información del vídeo como Author titlte duración todo lo que permita la página xd solo eso si funca Pero quiero esl xd

const axios = require("axios")
const qs = require("qs")
const cheerio = require("cheerio")

module.exports = function (app) {

  async function scrapeFacebook(url) {
    const UA = "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"

    const home = await axios.get("https://fbdown.to/id", {
      headers: { "user-agent": UA },
      timeout: 15000
    })

    const cookie = home.headers["set-cookie"]?.join("; ") || ""
    const html = home.data

    const k_token = html.match(/k_token="(.*?)"/)?.[1]
    const k_exp = html.match(/k_exp="(.*?)"/)?.[1]

    if (!k_token || !k_exp) {
      throw new Error("Token no encontrado")
    }

    const res = await axios.post(
      "https://fbdown.to/api/ajaxSearch",
      qs.stringify({
        k_token,
        k_exp,
        p: "home",
        q: url,
        lang: "id",
        v: "v2",
        w: ""
      }),
      {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "accept": "*/*",
          "x-requested-with": "XMLHttpRequest",
          "user-agent": UA,
          "origin": "https://fbdown.to",
          "referer": "https://fbdown.to/id",
          "cookie": cookie
        },
        timeout: 8000
      }
    )

    if (!res.data?.data) {
      throw new Error("No se pudo obtener el video")
    }

    const $ = cheerio.load(res.data.data)
    let results = []

    $("a").each((i, e) => {
      const href = $(e).attr("href")

      if (href && href.includes("token=")) {
        try {
          const token = href.split("token=")[1]
          const payload = JSON.parse(
            Buffer.from(token.split(".")[1], "base64").toString()
          )

          const filename = payload.filename || ""

          let quality = "unknown"

          if (filename.includes("(HD)")) quality = "HD"
          else if (filename.includes("(SD)")) quality = "SD"

          if (quality !== "unknown") {
            results.push({
              quality,
              url: href
            })
          }

        } catch {}
      }
    })

    if (!results.length) {
      throw new Error("Links no encontrados")
    }

    const order = { SD: 1, HD: 2 }
    results.sort((a, b) => order[a.quality] - order[b.quality])

    return results
  }

  app.get("/download/facebook/v2", async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          error: "URL requerida"
        })
      }

      const data = await scrapeFacebook(url)

      return res.json({
        status: true,
        result: data
      })

    } catch (err) {
      console.error("[FACEBOOK GET ERROR]", err.message)
      return res.status(500).json({
        status: false,
        error: err.message
      })
    }
  })

  app.post("/download/facebook/v2", async (req, res) => {
    try {
      const { url } = req.body

      if (!url) {
        return res.status(400).json({
          status: false,
          error: "URL requerida"
        })
      }

      const data = await scrapeFacebook(url)

      return res.json({
        status: true,
        result: data
      })

    } catch (err) {
      console.error("[FACEBOOK POST ERROR]", err.message)
      return res.status(500).json({
        status: false,
        error: err.message
      })
    }
  })

}