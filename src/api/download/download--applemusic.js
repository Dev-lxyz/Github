module.exports = function (app) {
  const axios = require('axios')
  const { CookieJar } = require('tough-cookie')
  const { wrapper } = require('axios-cookiejar-support')

  const BASE = 'https://aaplmusicdownloader.com'

  const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

  const sessionCache = {
    timestamp: 0,
    jar: new CookieJar(),
    client: null
  }

  function getClient() {
    const now = Date.now()

    if (sessionCache.client && now - sessionCache.timestamp < 300000) {
      return sessionCache.client
    }

    sessionCache.jar = new CookieJar()

    sessionCache.client = wrapper(
      axios.create({
        baseURL: BASE,
        jar: sessionCache.jar,
        withCredentials: true,
        timeout: 10000,
        headers: {
          'user-agent': UA,
          accept: 'application/json, text/javascript, */*; q=0.01',
          referer: BASE + '/song.php'
        }
      })
    )

    sessionCache.timestamp = now

    return sessionCache.client
  }

  async function warmup(client) {
    try {
      await client.get('/song.php')
    } catch {}
  }

  const QUALITIES = {
    m4a: {
      name: 'M4A 256kbps',
      format: 'm4a',
      bitrate: '256kbps'
    },
    mp3: {
      name: 'MP3 320kbps',
      format: 'mp3',
      bitrate: '320kbps'
    }
  }

  async function getAppleMeta(url) {
    try {
      const id = url.match(/i=(\d+)/)?.[1]

      if (!id) return null

      const api = `https://itunes.apple.com/lookup?id=${id}`

      const { data } = await axios.get(api)

      const song = data.results?.[0]

      if (!song) return null

      return {
        title: song.trackName,
        artist: song.artistName,
        album: song.collectionName,
        duration: Math.floor(song.trackTimeMillis / 1000),
        thumbnail: song.artworkUrl100?.replace('100x100', '600x600')
      }
    } catch {
      return null
    }
  }

  async function convertApple(url, quality = 'm4a') {
    const client = getClient()

    await warmup(client)

    const payload = new URLSearchParams()

    payload.set('url', url)
    payload.set('song_name', '')
    payload.set('artist_name', '')
    payload.set('quality', quality)
    payload.set('token', 'none')
    payload.set('zip_download', 'false')

    const { data } = await client.post(
      '/api/composer/swd.php',
      payload.toString(),
      {
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'x-requested-with': 'XMLHttpRequest',
          origin: BASE,
          referer: BASE + '/song.php'
        }
      }
    )

    if (!data?.dlink) {
      return {
        status: false,
        error: 'No se pudo obtener descarga'
      }
    }

    const meta = await getAppleMeta(url)

    const durationSec = meta?.duration || 0
    const min = Math.floor(durationSec / 60)
    const sec = durationSec % 60

    return {
      status: true,
      data: {
        title: meta?.title || 'Unknown',
        artist: meta?.artist || 'Unknown',
        album: meta?.album || null,
        duration: `${min}:${sec.toString().padStart(2, '0')}`,
        duration_seconds: durationSec,
        explicit: false,
        thumbnail: meta?.thumbnail || null,
        apple_url: url,
        dl_url: data.dlink,
        quality: {
          id: quality,
          ...QUALITIES[quality]
        }
      }
    }
  }

  app.get('/download/applemusic', async (req, res) => {
    try {
      const { url, quality = 'm4a' } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          error: 'url requerida'
        })
      }

      const q = quality.toLowerCase()

      if (!QUALITIES[q]) {
        return res.status(400).json({
          status: false,
          error: 'calidad inválida'
        })
      }

      const result = await convertApple(url, q)

      res.json(result)
    } catch (e) {
      res.status(500).json({
        status: false,
        error: 'internal error'
      })
    }
  })

  app.get('/download/applemusic/qualities', (req, res) => {
    res.json({
      status: true,
      qualities: QUALITIES
    })
  })
}