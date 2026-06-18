const crypto = require('crypto')
const axios = require('axios')

module.exports = function(app) {

  const ENDPOINT = 'https://api.proactor.ai:7788/v1/tourists/files/transcription'
  const HEADERS = {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    origin: 'https://videotranscriber.ai',
    referer: 'https://videotranscriber.ai/',
    'user-agent':
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36'
  }

  function makeTrackId() {
    return `${crypto.randomUUID()}_${Date.now()}`
  }

  function msToTime(ms = 0) {
    const total =
      Math.floor(Number(ms) / 1000)
    const minute =
      Math.floor(total / 60)
    const second =
      total % 60

    return `${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
  }

  function joinTranscript(items = []) {

    return items
      .map(v => v?.text || '')
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

  }

  function cleanResult(input, json) {

    const data =
      Array.isArray(json?.data)
        ? json.data
        : []

    if (
      json?.code !== 200 ||
      data.length === 0
    ) {

      return {
        status: false,
        code: json?.code || 500,
        input,
        error:
          json?.msg ||
          json?.message ||
          'Transcript no encontrado',
        raw: json
      }

    }

    const title =
      data.find(v => v?.videoTitle)
        ?.videoTitle || 'No title'

    const segments =
      data.map((item, index) => ({
        index: index + 1,
        startMs:
          item?.duration || 0,
        start:
          msToTime(item?.duration || 0),
        text:
          item?.text || ''
      }))

    return {
      status: true,
      code: 200,
      input,
      title,
      total: segments.length,
      transcript:
        joinTranscript(data),
      segments
    }

  }

  async function transcriber(
    url,
    options = {}
  ) {

    if (
      !url ||
      !/^https?:\/\//i.test(
        String(url)
      )
    ) {

      return {
        status: false,
        code: 400,
        error:
          'URL inválida'
      }

    }

    const input =
      String(url).trim()

    const body = {
      track_id:
        options.track_id ||
        makeTrackId(),

      fileUrl: input,

      language:
        options.language || 'en'
    }

    try {

      const { data } =
        await axios.post(
          ENDPOINT,
          body,
          {
            headers: HEADERS,
            timeout: 60000
          }
        )

      return cleanResult(
        input,
        data
      )

    } catch (e) {

      return {
        status: false,
        code:
          e.response?.status || 500,
        input,
        error:
          e.response?.data?.msg ||
          e.message
      }

    }

  }

  app.get('/tools/youtube-transcriber', async (req, res) => {
      try {
        const {
          url,
          lang
        } = req.query

        if (!url) {

          return res.status(400).json({
            status: false,
            message:
              'Falta el parámetro url'
          })

        }

        const result =
          await transcriber(
            url,
            {
              language:
                lang || 'en'
            }
          )

        return res.json(result)

      } catch (e) {

        return res.status(500).json({
          status: false,
          error: e.message
        })

      }

    }
  )

}