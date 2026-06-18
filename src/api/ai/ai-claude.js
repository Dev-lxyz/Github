module.exports = function (app) {
  const { ClaudeClient } = require('../../lib/claude')

  const claude = new ClaudeClient()

  app.get('/ai/claude', async (req, res) => {
    try {
      const { text } = req.query

      if (!text) {
        return res.status(400).json({
          status: false,
          message: 'Falta el parámetro text'
        })
      }

      if (!claude.isAuthenticated) {
        return res.status(500).json({
          status: false,
          message: 'Claude no está autenticado'
        })
      }

      const result = await claude.chat(text)

      return res.status(200).json({
        status: true,
        data: {
          response: result.text,
          conversationId: result.conversationId,
          assistantUUID: result.assistantUUID,
          humanUUID: result.humanUUID
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