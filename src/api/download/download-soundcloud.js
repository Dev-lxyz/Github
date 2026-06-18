const axios = require('axios')

const BASE_API_URL = 'https://api-v2.soundcloud.com'

const HEADERS = {
  Origin: 'https://soundcloud.com',
  Referer: 'https://soundcloud.com/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
}

async function getClientID() {
  const html = await axios.get('https://soundcloud.com', { headers: HEADERS })
  const jsFiles = html.data.match(/https:\/\/a-v2\.sndcdn\.com\/assets\/.+?\.js/g)

  if (!jsFiles) throw new Error('Assets JS no encontrados')

  for (const js of jsFiles) {
    const jsBody = await axios.get(js)
    const match = jsBody.data.match(/client_id:"([a-zA-Z0-9]{32})"/)
    if (match) return match[1]
  }

  throw new Error('Client ID no encontrado')
}

async function resolveTrack(url, client_id) {
  const res = await axios.get(`${BASE_API_URL}/resolve`, {
    headers: HEADERS,
    params: { url, client_id }
  })
  return res.data
}

async function resolveStreamUrl(transcodingUrl, trackAuthorization, client_id) {
  const res = await axios.get(transcodingUrl, {
    headers: HEADERS,
    params: {
      client_id,
      track_authorization: trackAuthorization
    }
  })
  return res.data.url
}

module.exports = function (app) {
  app.get('/download/soundcloud', async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          error: 'Falta el parámetro url'
        })
      }

      if (!/soundcloud\.com/i.test(url)) {
        return res.status(400).json({
          status: false,
          error: 'URL de SoundCloud inválida'
        })
      }

      const client_id = await getClientID()

      const track = await resolveTrack(url, client_id)

      const transcoding = track.media?.transcodings?.find(
        t => t.format.protocol === 'progressive'
      )

      if (!transcoding) {
        return res.status(404).json({
          status: false,
          error: 'No se encontró audio descargable'
        })
      }

      const streamUrl = await resolveStreamUrl(
        transcoding.url,
        track.track_authorization,
        client_id
      )

      res.json({
        status: true,
        result: {
          id: track.id,
          title: track.title,
          author: track.user?.username,
          author_url: track.user?.permalink_url,
          duration: track.duration,
          artwork: track.artwork_url
            ? track.artwork_url.replace('-large', '-t500x500')
            : null,
          permalink: track.permalink_url,
          download_url: streamUrl
        }
      })
    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.response?.data || e.message
      })
    }
  })
}