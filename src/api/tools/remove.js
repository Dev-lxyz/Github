const { removeBg, downloadImage } = require("../../lib/remove")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

module.exports = function (app) {

  app.get("/tools/removebg", async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "falta parametro ?url="
        })
      }

      const ext = path.extname(url.split("?")[0]) || ".jpg"

      const fileName = crypto.randomBytes(10).toString("hex") + ext

      const filePath = path.join(process.cwd(), "files", fileName)

      await downloadImage(url, filePath)

      const result = await removeBg(filePath)

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }

      return res.json(result)

    } catch (e) {

      return res.status(500).json({
        status: false,
        message: e.message
      })

    }
  })

}