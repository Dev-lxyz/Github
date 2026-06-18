module.exports = function (app) {
  const axios = require("axios")

  const hentai_url =
    "https://raw.githubusercontent.com/shadox-xyz/Test/main/nsfw/hentai.json"

  async function getRandomhentai() {
    const res = await axios.get(hentai_url, { timeout: 10000 })

    const urls = res.data
    if (!Array.isArray(urls) || !urls.length) {
      throw new Error("JSON inválido o vacío")
    }

    return urls[Math.floor(Math.random() * urls.length)]
  }

  app.get("/nsfw/hentai", async (req, res) => {
    try {
      const image = await getRandomhentai()

      res.json({
        status: true,
        result: {
          url: image
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