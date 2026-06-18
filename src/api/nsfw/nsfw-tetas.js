module.exports = function (app) {
  const axios = require("axios")

  const tetas_url =
    "https://raw.githubusercontent.com/shadox-xyz/Test/main/nsfw/tetas.json"

  async function getRandomtetas() {
    const res = await axios.get(tetas_url, { timeout: 10000 })

    const urls = res.data
    if (!Array.isArray(urls) || !urls.length) {
      throw new Error("JSON inválido o vacío")
    }

    return urls[Math.floor(Math.random() * urls.length)]
  }

  app.get("/nsfw/tetas", async (req, res) => {
    try {
      const image = await getRandomtetas()

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