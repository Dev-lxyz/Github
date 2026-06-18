const { NoteGPT } = require("../../lib/gemini-3.1")

module.exports = function (app) {

  app.get("/ai/gemini-3.1", async (req, res) => {
    try {
      const { text } = req.query

      if (!text) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro text"
        })
      }

      const result = await NoteGPT(text)

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