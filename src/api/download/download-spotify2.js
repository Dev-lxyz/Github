module.exports = function (app) {
  const axios = require('axios')
  const { CookieJar } = require('tough-cookie')
  const { wrapper } = require('axios-cookiejar-support')

  const BASE = 'https://spotmate.online'
  const PAGE = `${BASE}/en1`
  const UA =
    'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/137 Mobile Safari/537.36'

  const jar = new CookieJar()

  const client = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      timeout: 12000,
      headers: {
        'user-agent': UA,
        accept: 'application/json'
      }
    })
  )

  let XSRF_TOKEN = null
  let LAST_XSRF = 0
  const XSRF_TTL = 1000 * 60 * 10 // 10 minutos

  const getXsrf = async () => {
    const now = Date.now()

    if (XSRF_TOKEN && now - LAST_XSRF < XSRF_TTL) {
      return XSRF_TOKEN
    }

    await client.get(PAGE)

    const cookies = await jar.getCookies(BASE)
    const xsrf = cookies.find(c => c.key === 'XSRF-TOKEN')

    if (!xsrf) throw new Error('XSRF-TOKEN no encontrado')

    XSRF_TOKEN = decodeURIComponent(xsrf.value)
    LAST_XSRF = now

    return XSRF_TOKEN
  }

  const convertSpotify = async url => {
    if (!/open\.spotify\.com/.test(url)) {
      return { status: false, error: 'Link de Spotify inválido' }
    }

    const xsrf = await getXsrf()

    const headers = {
      'content-type': 'application/json',
      'x-xsrf-token': xsrf,
      origin: BASE,
      referer: PAGE
    }

    // ⚡ Requests en paralelo
    const [trackRes, convertRes] = await Promise.all([
      client.post(`${BASE}/getTrackData`, { spotify_url: url }, { headers }),
      client.post(`${BASE}/convert`, { urls: url }, { headers })
    ])

    const t = trackRes.data
    const d = convertRes.data

    return {
      status: true,
      result: {
        id: t.id,
        title: t.name,
        artist: t.artists?.map(a => a.name).join(', ') || '',
        duration: `${Math.floor(t.duration_ms / 60000)}:${String(
          Math.floor((t.duration_ms % 60000) / 1000)
        ).padStart(2, '0')}`,
        explicit: t.explicit,
        thumbnail: t.album?.images?.[0]?.url || null,
        spotify_url: t.external_urls?.spotify,
        download_url: d.url
      }
    }
  }

  // ======================
  // Endpoint
  // ======================
  app.get('/download/spotify/v2', async (req, res) => {
    try {
      const { url } = req.query
      if (!url) {
        return res.status(400).json({
          status: false,
          error: "Falta el parámetro 'url'"
        })
      }

      const data = await convertSpotify(url)
      res.json(data)
    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.response?.data || e.message
      })
    }
  })
}