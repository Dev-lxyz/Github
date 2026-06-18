const https = require('https')

const REQUEST_HEADERS = {
  "Host": "api.ttsopenai.com",
  "Connection": "keep-alive",
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzAxMjM0MzYsInN1YiI6ImIzYjJjMTE4LTAwMzYtMTFmMS05YjNlLTc2ZjBiYWIzZTk4NiJ9.7PSs4fMX8Zt70d-9kpPr4Xa6NdpIQjuv8_VF5GIvY3Y",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Origin": "https://ttsopenai.com",
  "Referer": "https://ttsopenai.com/",
  "X-Requested-With": "XMLHttpRequest"
}

const makeRequest = (method, path, data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.ttsopenai.com',
      port: 443,
      path,
      method,
      headers: REQUEST_HEADERS
    }

    const req = https.request(options, res => {
      let body = ''
      res.on('data', chunk => (body += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch {
          reject(new Error('Respuesta no JSON'))
        }
      })
    })

    req.on('error', reject)
    if (data) req.write(JSON.stringify(data))
    req.end()
  })
}

const delay = ms => new Promise(r => setTimeout(r, ms))

module.exports = function (app) {

  app.get('/ai/openai', async (req, res) => {
    try {
      const { text } = req.query

      if (!text) {
        return res.status(400).json({
          status: false,
          error: "Falta parámetro: text"
        })
      }

      const initResponse = await makeRequest(
        'POST',
        '/api/v1/text-to-speech-stream',
        {
          model: 'tts-1',
          speed: 1,
          input: text,
          voice_id: 'OA001',
          output_format: 'mp3',
          output_channel: 'mono'
        }
      )

      if (!initResponse.uuid) {
        return res.status(500).json({
          status: false,
          error: 'No se recibió UUID',
          response: initResponse
        })
      }

      await delay(3000)

      const checkResponse = await makeRequest(
        'GET',
        `/api/v1/history/${initResponse.uuid}`
      )

      if (!checkResponse.media_url) {
        return res.status(500).json({
          status: false,
          error: 'Audio no generado',
          response: checkResponse
        })
      }

      res.json({
        status: true,
        result: {
          text,
          voice: 'OA001',
          format: 'mp3',
          download_url: checkResponse.media_url
        }
      })

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      })
    }
  })
}