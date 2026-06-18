const fetch = require('node-fetch')

module.exports = function (app) {

  app.get('/tools/translate', async (req, res) => {
    try {
      const { text, to = 'es' } = req.query

      if (!text) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro 'text'"
        })
      }

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      })

      const json = await response.json()

      if (!json || !json[0]) {
        throw new Error('No se pudo traducir')
      }

      const translated = json[0]
        .map(v => v[0])
        .join('')

      const detectedLang = json?.[2] || 'unknown'

      res.json({
        status: true,
        result: {
          original: text,
          translated,
          from: detectedLang,
          to
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