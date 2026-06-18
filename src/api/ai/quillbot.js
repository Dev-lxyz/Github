module.exports = function (app) {
  const { chatStream } = require('../../lib/quillbot.js')

  app.get('/ai/quillbot', async (req, res) => {
    try {
      const { prompt } = req.query

      if (!prompt) {
        return res.status(400).json({
          status: false,
          message: "Missing parameter 'prompt'"
        })
      }

      let response = ''

      for await (const chunk of chatStream(prompt)) {
        response += chunk
      }

      res.json({
        status: true,
        result: response.trim()
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })
}