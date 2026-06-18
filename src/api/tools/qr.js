const axios = require('axios')

module.exports = function(app) {

  app.get('/tools/qr', async (req, res) => {
    try {
      const { text, url, size } = req.query
      if (text) {
        const qrSize = size || 300
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(text)}&format=png&ecc=M`

        const response = await axios.get(qrUrl, {
          responseType: 'arraybuffer',
          timeout: 15000
        })

        res.setHeader('Content-Type', 'image/png')
        return res.send(Buffer.from(response.data))
      }

      if (url) {
        const response = await axios.get(
          `https://api.qrserver.com/v1/read-qr-code/?fileurl=${encodeURIComponent(url)}`,
          { timeout: 15000 }
        )

        const result = response.data?.[0]?.symbol?.[0]

        if (!result || result.error) {
          return res.status(400).json({
            status: false,
            error: 'QR inválido o no se pudo leer'
          })
        }

        return res.json({
          status: true,
          result: {
            text: result.data || '',
            type: result.type || ''
          }
        })
      }

      return res.status(400).json({
        status: false,
        error: 'Usa ?text= para generar o ?url= para leer QR'
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })

}