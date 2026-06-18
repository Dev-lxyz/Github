const axios = require('axios')

module.exports = function (app) {

  function convertid(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|embed|watch|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  async function resolveid(input) {
    const direct = convertid(input)
    if (direct) return direct

    const { data } = await axios.get(
      `https://test.flvto.online/search/?q=${encodeURIComponent(input)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
          origin: 'https://v5.ytmp4.is',
          referer: 'https://v5.ytmp4.is/'
        },
        timeout: 10000
      }
    )

    if (!data.items || !data.items.length)
      throw new Error('No results found')

    return data.items[0].id
  }

  async function ytmp4is(input, format = 'mp4') {
    const youtube_id = await resolveid(input)
    if (!youtube_id) throw new Error('Invalid yt url or query')

    const { data } = await axios.post(
      'https://ht.flvto.online/converter',
      { id: youtube_id, fileType: format },
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
          'Content-Type': 'application/json',
          origin: 'https://ht.flvto.online',
          referer: `https://ht.flvto.online/button?url=https://www.youtube.com/watch?v=${youtube_id}&fileType=${format}`
        },
        timeout: 15000
      }
    )

    if (format === 'mp3') {
      return {
        title: data.title,
        type: 'mp3',
        filesize: data.filesize,
        duration: data.duration,
        download: data.link
      }
    }

    if (format === 'mp4') {
      if (!Array.isArray(data.formats) || !data.formats.length)
        throw new Error('No formats found')

      const sorted = data.formats.sort((a, b) => b.height - a.height)
      const selected =
        sorted.find(v => v.qualityLabel === '720p') ||
        sorted[0]

      return {
        title: data.title,
        type: 'mp4',
        quality: selected.qualityLabel,
        download: selected.url
      }
    }
  }

  // 🎬 Endpoint
  app.get('/download/ytaudio', async (req, res) => {
    try {
      const { url, format = 'mp3' } = req.query
      if (!url)
        return res.status(400).json({
          status: false,
          error: 'URL o texto requerido'
        })

      if (!['mp3', 'mp4'].includes(format))
        return res.status(400).json({
          status: false,
          error: 'Formato inválido (mp3/mp4)'
        })

      const result = await ytmp4is(url, format)

      res.json({
        status: true,
        result
      })

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      })
    }
  })

}