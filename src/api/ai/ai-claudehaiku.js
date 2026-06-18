const { overchat } = require("../../lib/claude-haiku")

module.exports = function (app) {

  app.get("/ai/claude-haiku", async (req, res) => {
    try {
      const { text } = req.query

      if (!text) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro text"
        })
      }

      const result = await overchat(text)

      return res.status(200).json({
        status: true,
        data: result.result
      })

    } catch (e) {
      return res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}