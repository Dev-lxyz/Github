const axios = require("axios")

module.exports = function (app) {

  app.get("/canvas/emojimix", async (req, res) => {
    try {
      const { emoji } = req.query
      if (!emoji) return res.status(400).send("Falta parámetro: emoji")

      const parts = emoji.split(",").map(e => e.trim())
      if (parts.length !== 2)
        return res.status(400).send("Usa formato: emoji=🥲,🥵")

      const [emoji1, emoji2] = parts

      const apiKey = "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ"

      const apiUrl =
        `https://tenor.googleapis.com/v2/featured` +
        `?key=${apiKey}` +
        `&contentfilter=high` +
        `&media_filter=png_transparent` +
        `&component=proactive` +
        `&collection=emoji_kitchen_v5` +
        `&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`

      const { data } = await axios.get(apiUrl)

      if (!data.results?.length)
        return res.status(404).send("No hay combinaciones")

      const pick = data.results[Math.floor(Math.random() * data.results.length)]

      // 🔥 URL REAL EN BUENA CALIDAD
      const imgUrl =
        pick.media_formats?.png_transparent?.url ||
        pick.media_formats?.png?.url

      if (!imgUrl)
        return res.status(500).send("Imagen no disponible")

      const img = await axios.get(imgUrl, {
        responseType: "arraybuffer"
      })

      res.set({
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400"
      })

      res.end(Buffer.from(img.data))

    } catch (e) {
      res.status(500).send(e.message)
    }
  })

}