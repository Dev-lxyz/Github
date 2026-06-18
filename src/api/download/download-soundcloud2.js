module.exports = function (app) {

  const cache = new Map()

  app.get('/download/soundcloud/v2', async (req, res) => {
    try {
      const { url, quality } = req.query

      if (!url) {
        return res.json({
          status: false,
          error: 'Falta url'
        })
      }

      const validQualities = [
        '64',
        '96',
        '128',
        '160',
        '192',
        '224',
        '256',
        '320'
      ]

      const q = validQualities.includes(String(quality))
        ? String(quality)
        : '320'

      const cacheKey = `${url}_${q}`

      if (cache.has(cacheKey)) {
        return res.json({
          status: true,
          cached: true,
          result: cache.get(cacheKey)
        })
      }

      const base = 'https://convertico.com/'

      const headers = {
        'accept': '*/*',
        'origin': base,
        'referer': base + 'soundcloud-downloader/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36'
      }

      const formInfo = new FormData()
      formInfo.append('action', 'fetch')
      formInfo.append('url', url)

      const info = await fetch(
        base + 'soundcloud-downloader/soundcloud-downloader.php',
        {
          method: 'POST',
          headers,
          body: formInfo
        }
      ).then(r => r.json())

      const formDownload = new FormData()
      formDownload.append('action', 'download')
      formDownload.append('url', url)
      formDownload.append('quality', q)
      formDownload.append('is_playlist', '0')

      const dl = await fetch(
        base + 'soundcloud-downloader/soundcloud-downloader.php',
        {
          method: 'POST',
          headers,
          body: formDownload
        }
      ).then(r => r.json())

      const downloadUrl =
        base +
        'soundcloud-downloader/' +
        dl.file_url
          .split('/')
          .map(encodeURIComponent)
          .join('/')

      const result = {
        title: info.title,
        author: info.author,
        duration: `${Math.floor(info.duration / 60)}:${String(info.duration % 60).padStart(2, '0')}`,
        views: info.view_count?.toLocaleString(),
        likes: info.like_count?.toLocaleString(),
        upload: info.upload_date,
        thumbnail: info.thumbnail,
        source: info.url,
        filename: dl.filename,
        size: `${(dl.size / 1024 / 1024).toFixed(2)} MB`,
        format: dl.format,
        quality: q + 'kbps',
        direct: downloadUrl,
        download: downloadUrl
      }

      cache.set(cacheKey, result)

      setTimeout(() => {
        cache.delete(cacheKey)
      }, 1000 * 60 * 60)

      res.json({
        status: true,
        cached: false,
        result
      })

    } catch (e) {
      res.json({
        status: false,
        error: e.message
      })
    }
  })

}