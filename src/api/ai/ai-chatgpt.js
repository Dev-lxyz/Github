module.exports = function (app) {
  const ChatGPTClient = require('../../lib/chatgpt')
  const chatgpt = new ChatGPTClient()
  app.get('/ai/chatgpt', async (req, res) => {
    try {
      const {
        text,
        model = 'auto',
        reset
      } = req.query

      if (!text) {
        return res.json({
          status: false,
          error: 'Falta parametro ?text='
        })
      }

      if (
        String(reset).toLowerCase() === 'true'
      ) {
        chatgpt.resetConversation()
      }

      const result =
        await chatgpt.sendMessage(
          text,
          {
            model
          }
        )

      res.json({
        status: true,
        model,
        conversation_id: result.conversationId || null,
        message_id: result.assistantMessageId || null,
        result: result.text || null
      })

    } catch (err) {

      res.json({
        status: false,
        error:
          err.response?.data ||
          err.message
      })

    }
  })

}