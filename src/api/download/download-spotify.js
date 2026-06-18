const axios = require('axios')
module.exports = function (app) {
  const cache = new Map()
  const CACHE_TTL = 1000 * 60 * 5
  async function spotifyDownload(url) {
    if (cache.has(url)) {
      const cached = cache.get(url)
      if (Date.now() < cached.expire) {
        return cached.data
      }

      cache.delete(url)
    }

    const { data } = await axios.post(
      'https://gamepvz.com/api/download/get-url',
      {
        url
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 20000
      }
    )

    if (data.code !== 200) {
      throw new Error(
        data.message || 'failed to download'
      )
    }

    const downloadUrl =
      'https://gamepvz.com' +
      data.originalVideoUrl

    const b64 =
      new URLSearchParams(
        data.originalVideoUrl.split('?')[1]
      ).get('url')

    const directUrl =
      Buffer.from(
        b64,
        'base64'
      ).toString('utf8')

    const result = {
      title: data.title || null,
      artist: data.authorName || null,
      cover: data.coverUrl || null,
      download: directUrl,
      source: downloadUrl
    }

    cache.set(url, {
      data: result,
      expire: Date.now() + CACHE_TTL
    })

    return result
  }

  app.get('/download/spotify', async (req, res) => {
    try {
      const { url } = req.query
      if (!url) {
        return res.json({
          status: false,
          error: 'falta parametro ?url='
        })
      }

      const result =
        await spotifyDownload(url)

      res.json({
        status: true,
        data: result
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