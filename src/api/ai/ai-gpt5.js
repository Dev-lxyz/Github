module.exports = function (app) {
  const axios = require('axios')

  const BASE_URL = 'https://api.lexcode.biz.id/api/ai/gpt5-nano'

  app.get('/ai/gpt5-nano', async (req, res) => {
    try {
      const { text } = req.query

      if (!text) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro 'text'"
        })
      }

      const response = await axios.get(BASE_URL, {
        params: { text },
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 15000
      })

      const data = response.data

      res.json({
        status: true,
        input: text,
        output: data.result?.result || null,
        meta: {
          status: data.result?.success || false,
          timestamp: data.result?.timestamp || null,
          responseTime: data.result?.responseTime || null
        }
      })

    } catch (err) {
      res.status(500).json({
        status: false,
        input: req.query.text || null,
        message: err.message,
        code: err.response?.status || 500
      })
    }
  })
}