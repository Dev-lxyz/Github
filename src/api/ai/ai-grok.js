module.exports = function (app) {
  const { chatGrok } = require('../../lib/grok.js')

  app.get('/ai/grok', async (req, res) => {
    try {
      const { prompt } = req.query

      if (!prompt) {
        return res.status(400).json({
          status: false,
          message: "Missing parameter 'prompt'"
        })
      }

      const result = await chatGrok(prompt)

      res.json({
        status: true,
        result
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })
}