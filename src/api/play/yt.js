module.exports = function (app) {

  const axios  = require('axios')
  const path   = require('path')
  const fs     = require('fs')
  const crypto = require('crypto')

  const QUALITY_AUDIO = ['96', '128', '256', '320']

  function extractYouTubeId(url) {
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|embed|watch|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  function mapAudioQuality(bitrate) {
    if (bitrate == 320) return 0
    if (bitrate == 256) return 1
    if (bitrate == 128) return 4
    if (bitrate == 96)  return 5
    return 4
  }

  function sanitizeFilename(name = '') {
    return name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'audio'
  }

  async function apiRequest(url, data) {
    return axios.post(url, data, {
      headers: {
        'User-Agent'  : 'Mozilla/5.0 (Linux; Android 10)',
        'Content-Type': 'application/json',
        'origin'      : 'https://cnvmp3.com',
        'referer'     : 'https://cnvmp3.com/v54'
      },
      timeout: 60000
    })
  }

  async function downloadFromCnvmp3(yturl, quality) {
    const youtube_id = extractYouTubeId(yturl)
    if (!youtube_id) throw new Error('URL de YouTube inválida')

    const formatValue  = 1
    const finalQuality = QUALITY_AUDIO.includes(String(quality))
      ? mapAudioQuality(parseInt(quality))
      : mapAudioQuality(128)

    const check = await apiRequest('https://cnvmp3.com/check_database.php', {
      youtube_id, quality: finalQuality, formatValue
    })

    if (check.data?.success) {
      return { title: check.data.data.title, download: check.data.data.server_path }
    }

    const yturlfull = `https://www.youtube.com/watch?v=${youtube_id}`

    const viddata = await apiRequest('https://cnvmp3.com/get_video_data.php', {
      url: yturlfull, token: '1234'
    })
    if (viddata.data.error) throw new Error(viddata.data.error)

    const title = viddata.data.title

    const dl = await apiRequest('https://cnvmp3.com/download_video_ucep.php', {
      url: yturlfull, quality: finalQuality, title, formatValue
    })
    if (dl.data.error) throw new Error(dl.data.error)

    return { title, download: dl.data.download_link }
  }

  // ─── GET /api/ytmp3 ───────────────────────────────────────────────────────
  app.get('/api/ytmp3', async (req, res) => {
    try {
      const { q, format = '128' } = req.query

      if (!q) {
        return res.status(400).json({ status: false, message: "Falta el parámetro 'q'" })
      }

      if (!QUALITY_AUDIO.includes(String(format))) {
        return res.status(400).json({
          status : false,
          message: 'Format inválido. Usa: 96, 128, 256, 320'
        })
      }

      // ── buscar en YouTube ─────────────────────────────────────────────────
      const { data: html } = await axios.get(
        'https://www.youtube.com/results',
        {
          params : { search_query: q },
          timeout: 6000,
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'es-PE,es;q=0.9' }
        }
      )

      const match = html.match(/var ytInitialData = (.*?);<\/script>/)
      if (!match) throw new Error('No se pudo obtener data de YouTube')

      const json     = JSON.parse(match[1])
      const contents =
        json.contents
          ?.twoColumnSearchResultsRenderer
          ?.primaryContents
          ?.sectionListRenderer
          ?.contents?.[0]
          ?.itemSectionRenderer
          ?.contents || []

      const first = contents.find(v => v.videoRenderer)
      if (!first) throw new Error('No se encontraron resultados')

      const r        = first.videoRenderer
      const videoUrl = 'https://youtu.be/' + r.videoId

      // ── obtener link de descarga ──────────────────────────────────────────
      const result = await downloadFromCnvmp3(videoUrl, format)

      // ── descargar buffer ──────────────────────────────────────────────────
      const fileRes = await axios.get(result.download, {
        responseType: 'arraybuffer',
        timeout     : 120000,
        headers     : {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
          'referer'   : 'https://cnvmp3.com/'
        }
      })

      // ── guardar en /files ─────────────────────────────────────────────────
      const filesDir = path.join(process.cwd(), 'files')
      if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true })

      const ext      = '.mp3'
      const name     = crypto.randomBytes(16).toString('hex') + ext
      const filePath = path.join(filesDir, name)

      fs.writeFileSync(filePath, fileRes.data)

      const buffer   = Buffer.from(fileRes.data)
      const sizeMB   = (buffer.length / 1024 / 1024).toFixed(2)
      const rawTitle = r.title?.runs?.[0]?.text || result.title || 'audio'
      const filename = sanitizeFilename(rawTitle) + ext
      const fileUrl  = `${req.protocol}://${req.get('host')}/files/${name}`

      return res.json({
        status: true,
        result: {
          title    : rawTitle,
          videoId  : r.videoId,
          author   : r.ownerText?.runs?.[0]?.text || '',
          url      : videoUrl,
          duration : r.lengthText?.simpleText || '0:00',
          views    : (r.viewCountText?.simpleText || '').replace(/ views?/i, '').trim(),
          uploaded : r.publishedTimeText?.simpleText || '',
          thumbnail: r.thumbnail?.thumbnails?.slice(-1)[0]?.url || '',
          audio    : true,
          video    : false,
          quality  : `${format}kbps`,
          download : {
            url     : fileUrl,
            filename,
            size    : sizeMB + ' MB'
          }
        }
      })

    } catch (e) {
      return res.status(500).json({ status: false, message: e.message })
    }
  })
}