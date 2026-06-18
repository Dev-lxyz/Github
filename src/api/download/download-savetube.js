const axios = require('axios')
const crypto = require('crypto')
module.exports = function (app) {
  const SECRET_KEY = Buffer.from(
    'C5D58EF67A7584E4A29F6C35BBC4EB12',
    'hex'
  )

  const cache = new Map()
  const CACHE_TTL = 1000 * 60 * 10

  function decrypt(enc) {
    const b = Buffer.from(
      enc.replace(/\s/g, ''),
      'base64'
    )

    const iv = b.subarray(0, 16)
    const data = b.subarray(16)

    const d = crypto.createDecipheriv(
      'aes-128-cbc',
      SECRET_KEY,
      iv
    )

    return JSON.parse(
      Buffer.concat([
        d.update(data),
        d.final()
      ]).toString()
    )
  }

  async function getCDN() {

    const key = 'cdn'

    if (cache.has(key)) {
      const c = cache.get(key)

      if (Date.now() < c.expire) {
        return c.data
      }

      cache.delete(key)
    }

    const { data } = await axios.get(
      'https://media.savetube.vip/api/random-cdn',
      {
        headers: {
          origin: 'https://save-tube.com',
          referer: 'https://save-tube.com/',
          'user-agent': 'Mozilla/5.0'
        }
      }
    )

    cache.set(key, {
      data: data.cdn,
      expire: Date.now() + 300000
    })

    return data.cdn
  }

  async function saveTube(url, type, quality) {

    const cacheKey =
      `${url}|${type}|${quality}`

    if (cache.has(cacheKey)) {

      const c = cache.get(cacheKey)

      if (Date.now() < c.expire) {
        return c.data
      }

      cache.delete(cacheKey)
    }

    const cdn = await getCDN()

    const { data: info } = await axios.post(
      `https://${cdn}/v2/info`,
      { url },
      {
        headers: {
          'content-type': 'application/json',
          origin: 'https://save-tube.com',
          referer: 'https://save-tube.com/',
          'user-agent': 'Mozilla/5.0'
        }
      }
    )

    if (!info.status) {
      throw new Error(
        'No se pudo obtener información'
      )
    }

    const meta = decrypt(info.data)

    const downloadType =
      type === 'audio'
        ? 'audio'
        : 'video'

    const { data: dl } = await axios.post(
      `https://${cdn}/download`,
      {
        id: meta.id,
        key: meta.key,
        downloadType,
        quality: String(quality)
      },
      {
        headers: {
          'content-type': 'application/json',
          origin: 'https://save-tube.com',
          referer: 'https://save-tube.com/',
          'user-agent': 'Mozilla/5.0'
        }
      }
    )

    const result = {
      title: meta.title,
      duration: meta.duration,
      thumbnail: meta.thumbnail,
      type,
      quality,
      dl:
        dl?.data?.downloadUrl || null
    }

    cache.set(cacheKey, {
      data: result,
      expire: Date.now() + CACHE_TTL
    })

    return result
  }

  app.get('/download/savetube', async (req, res) => {
    try {
      const {
        url,
        type,
        quality
      } = req.query

      if (!url) {
        return res.json({
          status: false,
          error: 'Falta parametro ?url='
        })
      }

      const q =
        quality ||
        (
          type === 'audio'
            ? '128'
            : '720'
        )

      const data = await saveTube(
        url,
        type.toLowerCase(),
        q
      )

      res.json({
        status: true,
        data
      })

    } catch (err) {

      res.json({
        status: false,
        error:
          err.response?.data ||
          err.message
      })

    }

  })

}