/*
module.exports = function (app) {
  const axios = require("axios")

  app.get("/random/loli", async (req, res) => {
    try {
      const response = await axios.get(
        "https://raw.githubusercontent.com/synshin9/loli-r-img/refs/heads/main/links.json",
        { timeout: 15000 }
      )

      const list = response.data

      if (!Array.isArray(list) || !list.length)
        return res.status(500).json({
          status: false,
          error: "No se pudo obtener imágenes"
        })

      const randomUrl = list[Math.floor(Math.random() * list.length)]

      const img = await axios.get(randomUrl, {
        responseType: "arraybuffer",
        timeout: 20000
      })

      res.set({
        "Content-Type": "image/png",
        "Content-Length": img.data.length
      })

      res.end(Buffer.from(img.data))

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })
}

*/

const axios = require("axios")
const crypto = require("crypto")
const path = require("path")
const fs = require("fs")

module.exports = function (app) {

  app.get("/random/loli", async (req, res) => {
    try {
      const { data } = await axios.get(
        "https://raw.githubusercontent.com/Dev-lxyz/alya/main/img/anime_loli.json"
      )

      const imgUrl = data[Math.floor(Math.random() * data.length)]

      const img = await axios.get(imgUrl, {
        responseType: "arraybuffer"
      })

      const ext = path.extname(imgUrl) || ".png"
      const name = crypto.randomBytes(16).toString("hex") + ext
      const filePath = path.join(process.cwd(), "files", name)

      fs.writeFileSync(filePath, img.data)

      res.json({
        status: true,
        data: {
          url: `${req.protocol}://${req.get("host")}/files/${name}`
        }
      })

    } catch (e) {
      res.json({
        status: false,
        error: e.message
      })
    }
  })
}