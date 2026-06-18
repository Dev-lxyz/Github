module.exports = function (app) {

  const axios = require('axios')
  const { CookieJar } = require('tough-cookie')
  const { wrapper } = require('axios-cookiejar-support')

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

  class Downr {
    constructor() {
      this.base = 'https://downr.org'
      this.analytics = `${this.base}/.netlify/functions/analytics`
      this.endpoint = `${this.base}/.netlify/functions/nyt`
    }

    makeClient(jar) {
      return wrapper(axios.create({
        jar,
        withCredentials: true,
        validateStatus: () => true,
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }))
    }

    async scrape(url, type = 'video') {
      try {
        if (!url) throw new Error('url is required')

        type = String(type).toLowerCase().trim()

        if (!['video', 'audio'].includes(type)) {
          throw new Error('type must be video or audio')
        }

        const jar = await this.createSession()
        const data = await this.fetchInfo(url, jar)

        const medias = Array.isArray(data?.medias) ? data.medias : []

        const filtered = medias.filter((media) => {
          if (type === 'audio') return this.isAudio(media)
          return this.isVideo(media)
        })

        if (!filtered.length) {
          throw new Error(`No se encontraron formatos de ${type}`)
        }

        const media = this.pickBest(filtered, type)

        return {
          title: this.clean(data.title) || 'download',
          source: url,
          type,
          thumbnail: data.thumbnail || data.image || data.cover || null,
          media: this.format(media),
          all: filtered.map((item) => this.format(item)),
        }
      } catch (e) {
        return {
          status: false,
          msg: e instanceof Error ? e.message : String(e),
        }
      }
    }

    async createSession() {
      const jar = new CookieJar()
      const client = this.makeClient(jar)

      await client.get(this.analytics, {
        headers: {
          Referer: `${this.base}/`,
          Origin: this.base,
          Accept: '*/*',
        },
        timeout: 30000,
      }).catch(() => null)

      return jar
    }

    async fetchInfo(url, jar, retry = false) {
      const client = this.makeClient(jar)

      const response = await client.post(this.endpoint, { url }, {
        headers: {
          Referer: `${this.base}/`,
          Origin: this.base,
          Accept: '*/*',
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      })

      if (response.status === 403 && !retry) {
        const newJar = await this.createSession()
        return this.fetchInfo(url, newJar, true)
      }

      if (response.status === 429) {
        throw new Error('Rate limited')
      }

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = typeof response.data === 'string' ? this.json(response.data) : response.data

      if (!data) {
        throw new Error('Respuesta inválida del servidor')
      }

      if (data.error) {
        throw new Error(data.message || 'URL inválida o no soportada')
      }

      return data
    }

    isAudio(media = {}) {
      const type = this.lower(media.type)
      const ext = this.lower(media.ext)
      const mime = this.lower(media.mime || media.mimetype || this.mimeFromUrl(media.url))

      return (
        type === 'audio' ||
        mime.startsWith('audio/') ||
        ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'opus', 'flac'].includes(ext)
      )
    }

    isVideo(media = {}) {
      const type = this.lower(media.type)
      const ext = this.lower(media.ext)
      const mime = this.lower(media.mime || media.mimetype || this.mimeFromUrl(media.url))

      return (
        type === 'video' ||
        mime.startsWith('video/') ||
        ['mp4', 'webm', 'mov', 'mkv'].includes(ext)
      )
    }

    pickBest(list = [], type = 'video') {
      const sorted = [...list].sort((a, b) => {
        if (type === 'audio') {
          return this.num(b.bitrate) - this.num(a.bitrate)
        }

        const audioB = b.is_audio ? 1 : 0
        const audioA = a.is_audio ? 1 : 0

        if (audioB !== audioA) {
          return audioB - audioA
        }

        const heightB = this.num(b.height)
        const heightA = this.num(a.height)

        if (heightB !== heightA) {
          return heightB - heightA
        }

        return this.num(b.bitrate) - this.num(a.bitrate)
      })

      return sorted[0] || null
    }

    format(media = {}) {
      return {
        url: media.url || null,
        type: media.type || null,
        ext: media.ext || null,
        quality: media.quality || media.label || null,
        height: media.height || null,
        width: media.width || null,
        bitrate: media.bitrate || null,
        size: media.size || media.filesize || media.fileSize || null,
        audio: Boolean(media.is_audio),
      }
    }

    mimeFromUrl(url) {
      try {
        return new URL(url).searchParams.get('mime') || ''
      } catch {
        return ''
      }
    }

    json(text) {
      try {
        return JSON.parse(text)
      } catch {
        return null
      }
    }

    clean(value) {
      if (value == null) return null
      const text = String(value).trim()
      return text || null
    }

    lower(value) {
      return String(value || '').toLowerCase().trim()
    }

    num(value) {
      const n = Number(value)
      return Number.isFinite(n) ? n : 0
    }
  }

  const downr = new Downr()

  app.get('/download/ytvideo', async (req, res) => {
    try {
      const { url, type } = req.query

      if (!url) {
        return res.json({
          status: false,
          error: "Falta parametro ?url="
        })
      }

      const result = await downr.scrape(url, type || 'video')

      if (!result.status) {
        return res.json({
          status: false,
          error: result.msg
        })
      }

      res.json({
        status: true,
        data: result
      })

    } catch (err) {
      res.json({
        status: false,
        error: err.message
      })
    }
  })

}
