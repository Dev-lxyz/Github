const axios = require("axios")
const cheerio = require("cheerio")

module.exports = function(app) {

  const API_CHALLENGE = "https://fsaver.net/api/challenge"
  const API_DOWNLOAD = "https://fsaver.net/en/download"

  const HEADERS = {
    "accept": "*/*",
    "content-type": "application/json",
    "origin": "https://fsaver.net",
    "user-agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"
  }

  const FORM_HEADERS = {
    "content-type": "application/x-www-form-urlencoded",
    "user-agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"
  }

  const instance = axios.create({
    timeout: 15000,
    maxRedirects: 5,
    validateStatus: s => s < 500
  })

  async function fsaver(url) {

    const challenge = await instance.post(
      API_CHALLENGE,
      { url },
      {
        headers: HEADERS
      }
    )

    const token = challenge.data?.token

    if (!token) {
      throw new Error("No se encontró token")
    }

    const body = new URLSearchParams({
      url,
      token
    })

    const page = await instance.post(
      API_DOWNLOAD,
      body.toString(),
      {
        headers: FORM_HEADERS
      }
    )

    const $ = cheerio.load(page.data)

    const result = []

    $("table tr").each((_, el) => {

      const quality = $(el)
        .find("td")
        .eq(0)
        .text()
        .trim()

      const href = $(el)
        .find("a[download]")
        .attr("href")

      if (!href) return

      result.push({
        quality,
        url: href
      })

    })

    const title =
      $(".download__item__profile_pic div")
        .first()
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim() || null

    const thumbnail =
      $(".download__item__profile_pic img")
        .attr("src") || null

    const hd =
      result.find(v =>
        /hd|1080|720/i.test(v.quality)
      ) || null

    const sd =
      result.find(v =>
        /sd|480|360/i.test(v.quality)
      ) || null

    return {
      status: result.length > 0,
      input: url,
      total: result.length,

      metadata: {
        title,
        thumbnail
      },

      downloads: {
        hd,
        sd,
        all: result
      }
    }
  }

  app.get("/download/facebook", async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro url"
        })
      }

      const result = await fsaver(url)

      return res.json(result)

    } catch (e) {

      return res.status(500).json({
        status: false,
        message: e.message
      })

    }
  })

}