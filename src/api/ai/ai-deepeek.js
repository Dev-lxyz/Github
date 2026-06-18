const Deepseek = require("../../lib/deepseek")

module.exports = function (app) {
  app.get("/ai/deepseek", async (req, res) => {
    try {
      const { prompt } = req.query
      if (!prompt) {
        return res.status(400).json({
          status: false,
          message: "Falta parámetro ?prompt="
        })
      }

      const result = await Deepseek(prompt)
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