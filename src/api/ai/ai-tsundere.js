const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

module.exports = function (app) {
  const { generateTsundereTTS } = require("../../lib/tsundere.js")

  app.get("/ai/tsundere-tts", async (req, res) => {
    try {

      const { text } = req.query

      if (!text) {
        return res.status(400).json({
          status: false,
          message: "Missing parameter ?text="
        })
      }

      const audio = await generateTsundereTTS(text)

      const name = crypto.randomBytes(7).toString("hex") + ".mp3"

      const filePath = path.join(process.cwd(), "files", name)

      fs.writeFileSync(filePath, audio)

      return res.json({
        status: true,
        result: {
          text,
          filename: name,
          size: `${(audio.length / 1024 / 1024).toFixed(2)} MB`,
          path: filePath,
          url: `${req.protocol}://${req.get("host")}/files/${name}`
        }
      })

    } catch (e) {

      return res.status(500).json({
        status: false,
        message: e.message
      })

    }
  })

}