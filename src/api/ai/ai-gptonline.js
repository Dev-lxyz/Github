const { GPTOnline } = require("../../lib/gptonline")

module.exports = function (app) {

  app.get("/ai/gptonline", async (req, res) => {
    try {
      const { text } = req.query

      if (!text) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro text"
        })
      }

      const response = await GPTOnline(text)

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