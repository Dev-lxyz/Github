const { askDeepAi } = require("../../lib/deepai-ai")

module.exports = function (app) {

  app.get("/ai/deepai", async (req, res) => {
    try {
      const { prompt } = req.query

      if (!prompt) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro ?prompt="
        })
      }

      const response = await askDeepAi(prompt)

      return res.status(200).json({
        status: true,
        result: response.result
      })

    } catch (e) {
      return res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}