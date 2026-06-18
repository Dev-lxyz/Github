module.exports = function (app) {
  const axios = require("axios")

  const YURI_JSON_URL =
    "https://raw.githubusercontent.com/shadox-xyz/Test/main/nsfw/loli.json"

  async function getRandomYuri() {
    const res = await axios.get(YURI_JSON_URL, { timeout: 10000 })

    const urls = res.data
    if (!Array.isArray(urls) || !urls.length) {
      throw new Error("JSON inválido o vacío")
    }

    return urls[Math.floor(Math.random() * urls.length)]
  }

  app.get("/nsfw/loli", async (req, res) => {
    try {
      const image = await getRandomYuri()

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