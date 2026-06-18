// routes/youtube.js  (CommonJS – module.exports = function(app){...})
module.exports = function (app) {

  const axios  = require('axios')
  const path   = require('path')
  const fs     = require('fs')
  const crypto = require('crypto')

  const QUALITY_VIDEO = ['144', '240', '360', '720', '1080']
  const QUALITY_AUDIO = ['96', '128', '256', '320']

  const instance = axios.create({
    timeout: 6000,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept-Language': 'es-PE,es;q=0.9'
    }
  })

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
    return name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'download'
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

  async function downloadFromCnvmp3(yturl, quality, type) {
    const youtube_id = extractYouTubeId(yturl)
    if (!youtube_id) throw new Error('URL de YouTube inválida')

    const formatValue  = type === 'mp4' ? 0 : 1
    let   finalQuality

    if (type === 'mp4') {
      finalQuality = QUALITY_VIDEO.includes(String(quality)) ? parseInt(quality) : 360
    } else {
      finalQuality = QUALITY_AUDIO.includes(String(quality))
        ? mapAudioQuality(parseInt(quality))
        : mapAudioQuality(128)
    }

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

  // ─── helper: save buffer to /files and return filename + local path ───────
  function saveToFiles(buffer, ext) {
    const filesDir = path.join(process.cwd(), 'files')
    if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true })

    const name     = crypto.randomBytes(16).toString('hex') + ext
    const filePath = path.join(filesDir, name)
    fs.writeFileSync(filePath, buffer)
    return { name, filePath }
  }

  // ─── GET /api/play/youtube ────────────────────────────────────────────────
  app.get('/api/play/youtube', async (req, res) => {
    try {
      const { q, format = '128', proxy = 'false' } = req.query

      if (!q) {
        return res.status(400).json({
          status : false,
          message: "Falta el parámetro 'q'"
        })
      }

      // ── resolve type ──────────────────────────────────────────────────────
      let type = null
      if (QUALITY_AUDIO.includes(String(format))) type = 'mp3'
      if (QUALITY_VIDEO.includes(String(format))) type = 'mp4'

      if (!type) {
        return res.status(400).json({
          status : false,
          message: 'Format inválido. Audio: 96,128,256,320 | Video: 144,240,360,720,1080'
        })
      }

      // proxy solo para audio
      const useProxy = proxy === 'true' && type === 'mp3'

      // ── search YouTube ────────────────────────────────────────────────────
      const { data: html } = await instance.get(
        'https://www.youtube.com/results',
        { params: { search_query: q } }
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
      const views    = (r.viewCountText?.simpleText || '').replace(/ views?/i, '').trim()

      // ── download link via cnvmp3 ──────────────────────────────────────────
      const result = await downloadFromCnvmp3(videoUrl, format, type)

      const ext      = type === 'mp3' ? '.mp3' : '.mp4'
      const rawTitle = r.title?.runs?.[0]?.text || result.title || 'download'
      const safeTitle = sanitizeFilename(rawTitle)
      const filename  = safeTitle + ext

      // ── build base response ───────────────────────────────────────────────
      let size     = null
      let fileInfo = null   // set when proxy saves to /files

      if (useProxy) {
        // ── proxy mode: download buffer → save to /files ──────────────────
        const fileRes = await axios.get(result.download, {
          responseType: 'arraybuffer',
          timeout: 120000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
            'referer'   : 'https://cnvmp3.com/'
          }
        })

        const buffer = Buffer.from(fileRes.data)
        size = (buffer.length / 1024 / 1024).toFixed(2) + ' MB'

        const saved = saveToFiles(buffer, ext)
        fileInfo = { name: saved.name }

      } else {
        // ── direct mode: just HEAD for size ──────────────────────────────
        try {
          const head  = await axios.head(result.download, { timeout: 15000 })
          const bytes = parseInt(head.headers['content-length'] || 0)
          if (bytes) size = (bytes / 1024 / 1024).toFixed(2) + ' MB'
        } catch {}
      }

      return res.json({
        status: true,
        result: {
          title    : rawTitle,
          videoId  : r.videoId,
          author   : r.ownerText?.runs?.[0]?.text || '',
          url      : videoUrl,
          duration : r.lengthText?.simpleText || '0:00',
          views,
          uploaded : r.publishedTimeText?.simpleText || '',
          thumbnail: r.thumbnail?.thumbnails?.slice(-1)[0]?.url || '',
          audio    : type === 'mp3',   // ← true/false
          video    : type === 'mp4',   // ← true/false
          quality  : type === 'mp3' ? `${format}kbps` : `${format}p`,
          download : {
            url     : result.download,
            filename,                  // ← "titulo-del-video.mp3"
            size,
            proxy   : useProxy,
            ...(fileInfo && { file: `${req.protocol}://${req.get('host')}/files/${fileInfo.name}` }), 
            dev: `agregue esto si proxy está en false\nconst file = await axios.get(res.download.url, {
        responseType: 'arraybuffer',
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
          'referer': 'https://cnvmp3.com/'
        }
      })` // solo si proxy=true
          }
        }
      })

    } catch (e) {
      return res.status(500).json({ status: false, message: e.message })
    }
  })
}