const { overchat } = require("../../lib/qwen-3")

module.exports = function (app) {

  app.get("/ai/qwen-3", async (req, res) => {
    try {
      const { text } = req.query

      if (!text) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro text"
        })
      }

      const result = await overchat(text)

      res.status(result.code || 200).json({
        status: true,
        data: {
          ...result
        }
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}