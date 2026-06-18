const FreeAIVideo = require("../../lib/ai-video")

module.exports = function (app) {

  app.get("/ai/video", async (req, res) => {
    try {

      const { prompt, image } = req.query

      if (!prompt) {
        return res.status(400).json({
          status: false,
          message: "Falta parametro ?prompt="
        })
      }

      const result = await FreeAIVideo(prompt, image || null)

      return res.json({
        status: true,
        result
      })

    } catch (e) {

      return res.status(500).json({
        status: false,
        message: e.message
      })

    }
  })

}