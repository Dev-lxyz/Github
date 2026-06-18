/*module.exports = function (app) {
  const axios = require('axios')

  const cache = new Map()

  async function ytdown(url, format = 'mp4') {

    const cacheKey = `${url}_${format}`

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)
    }

    const { data } = await axios.post(
      'https://app.ytdown.to/proxy.php',
      new URLSearchParams({ url }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 20000
      }
    )

    const api = data.api

    if (api?.status === 'ERROR') {
      throw new Error(api.message)
    }

    const type = format === 'mp3' ? 'audio' : 'video'

    const media = api?.mediaItems?.find(
      v => v.type.toLowerCase() === type
    )

    if (!media) {
      throw new Error('Format not found')
    }

    while (true) {

      const { data: res } = await axios.get(media.mediaUrl, {
        timeout: 20000
      })

      if (res?.error === 'METADATA_NOT_FOUND') {
        throw new Error('Metadata not found')
      }

      if (
        res?.percent === 'Completed' &&
        res?.fileUrl !== 'In Processing...'
      ) {

        const result = {
          title: api.title,
          description: api.description,
          thumbnail: api.imagePreviewUrl,
          uploader: api.userInfo?.name,
          views: api.mediaStats?.viewsCount,
          duration: media.mediaDuration,
          quality: media.mediaQuality,
          ext: media.mediaExtension,
          size: media.mediaFileSize,
          download: res.fileUrl
        }

        cache.set(cacheKey, result)

        setTimeout(() => {
          cache.delete(cacheKey)
        }, 1000 * 60 * 30)

        return result
      }

      await new Promise(r => setTimeout(r, 1500))
    }
  }

  app.get('/download/ytdl/v2', async (req, res) => {
    try {

      const { url, format = 'mp4' } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Missing parameter 'url'"
        })
      }

      if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
        return res.status(400).json({
          status: false,
          message: 'Invalid YouTube URL'
        })
      }

      if (!['mp3', 'mp4'].includes(format)) {
        return res.status(400).json({
          status: false,
          message: "Format only mp3 or mp4"
        })
      }

      const result = await ytdown(url, format)

      res.json({
        status: true,
        format,
        result
      })

    } catch (e) {

      res.status(500).json({
        status: false,
        message: e.message
      })

    }
  })
}
*/
module.exports = function (app) {
  const axios = require('axios')
  const { createApiKeyMiddleware } = require('./../../lib/apikey.js')
  const cache = new Map()

  async function ytdown(url, format = 'mp4', quality = '') {

    const cacheKey = `${url}_${format}_${quality}`

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)
    }

    const { data } = await axios.post(
      'https://app.ytdown.to/proxy.php',
      new URLSearchParams({ url }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 20000
      }
    )

    const api = data.api

    if (api?.status === 'ERROR') {
      throw new Error(api.message)
    }

    const type = format === 'mp3' || format === 'm4a'
      ? 'audio'
      : 'video'

    let mediaList = api?.mediaItems?.filter(
      v => v.type.toLowerCase() === type
    )

    if (!mediaList || !mediaList.length) {
      throw new Error('Format not found')
    }

    if (quality) {

      mediaList = mediaList.filter(v => {
        const q = String(v.mediaQuality || '').toLowerCase()
        const s = String(v.mediaFileSize || '').toLowerCase()
        const e = String(v.mediaExtension || '').toLowerCase()

        return (
          q.includes(quality.toLowerCase()) ||
          s.includes(quality.toLowerCase()) ||
          e.includes(quality.toLowerCase())
        )
      })

      if (!mediaList.length) {
        throw new Error('Quality not found')
      }
    }

    const media = mediaList[0]

    while (true) {

      const { data: res } = await axios.get(media.mediaUrl, {
        timeout: 20000
      })

      if (res?.error === 'METADATA_NOT_FOUND') {
        throw new Error('Metadata not found')
      }

      if (
        res?.percent === 'Completed' &&
        res?.fileUrl !== 'In Processing...'
      ) {

        const qualities = api.mediaItems.map(v => ({
          type: v.type,
          quality: v.mediaQuality,
          ext: v.mediaExtension,
          size: v.mediaFileSize,
          duration: v.mediaDuration
        }))

        const result = {
          title: api.title,
          description: api.description,
          thumbnail: api.imagePreviewUrl,
          uploader: api.userInfo?.name,
          views: api.mediaStats?.viewsCount,
          duration: media.mediaDuration,
          quality: media.mediaQuality,
          ext: media.mediaExtension,
          size: media.mediaFileSize,
          availableQualities: qualities,
          download: res.fileUrl
        }

        cache.set(cacheKey, result)

        setTimeout(() => {
          cache.delete(cacheKey)
        }, 1000 * 60 * 30)

        return result
      }

      await new Promise(r => setTimeout(r, 1500))
    }
  }

  app.get('/download/ytdl/v2', createApiKeyMiddleware(), async (req, res) => {
    try {

      const {
        url,
        format = 'mp4',
        quality = ''
      } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Missing parameter 'url'"
        })
      }

      if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
        return res.status(400).json({
          status: false,
          message: 'Invalid YouTube URL'
        })
      }

      if (!['mp3', 'mp4', 'm4a'].includes(format)) {
        return res.status(400).json({
          status: false,
          message: "Format only mp3, mp4 or m4a"
        })
      }

      const result = await ytdown(url, format, quality)

      res.json({
        status: true,
        format,
        quality,
        result
      })

    } catch (e) {

      res.status(500).json({
        status: false,
        message: e.message
      })

    }
  })
}