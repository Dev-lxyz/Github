module.exports = function (app) {

  app.get('/ai/nova', async (req, res) => {
    try {
      const { text } = req.query

      if (!text) {
        return res.status(400).json({
          status: false,
          message: 'Falta el parámetro ?text='
        })
      }

      const headers = {
        'User-Agent': 'okhttp/4.10.0',
        'Accept-Encoding': 'gzip',
        'platform': 'Android',
        'version': '1.4.0',
        'language': 'in',
        'content-type': 'application/json; charset=utf-8'
      }

      const payload = {
        question_text: text,
        conversation: {
          conversation_items: []
        }
      }

      const response = await fetch(
        'https://us-central1-nova-ai---android.cloudfunctions.net/app/ai-response/v2',
        {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        }
      )

      const data = await response.json()

      return res.json({
        status: true,
        result: data
      })

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message
      })
    }
  })

}