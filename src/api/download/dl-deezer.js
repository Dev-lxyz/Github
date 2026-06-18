module.exports = function (app) {
  const axios  = require('axios')
  const crypto = require('crypto')

  const FLAC_BASE       = 'https://flacdownloader.com'
  const UP1_BASE        = 'https://up1.sr00.workers.dev'
  const DOWNLOAD_ACCESS = 'l@p*gute)77=g5clebcp4lz#=x%(*rwg+ku0_)bh=&%6wg!a'
  const UA              = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

  function getTrackId(url) {
    const m = url.match(/track\/(\d+)/)
    if (!m) throw new Error('URL de Deezer inválida')
    return m[1]
  }

  async function getToken(id, format) {
    const res = await fetch(
      `${FLAC_BASE}/flac/download-token?t=${id}&f=${format}`,
      {
        headers: {
          Accept: '*/*',
          Referer: `${FLAC_BASE}/`,
          'User-Agent': UA,
          'x-download-access': DOWNLOAD_ACCESS
        }
      }
    )
    return res.json()
  }

  async function downloadTrack(id, format) {
    const token = await getToken(id, format)

    const res = await fetch(
      `${FLAC_BASE}/flac/download?t=${id}&f=${format}&token=${token.token}&expires=${token.expires}`,
      {
        headers: {
          Accept: '*/*',
          Referer: `${FLAC_BASE}/`,
          'User-Agent': UA
        }
      }
    )

    const buffer   = Buffer.from(await res.arrayBuffer())
    const filename = res.headers.get('content-disposition')
      ?.match(/filename="?([^"]+)/i)?.[1] || `${id}.${format.toLowerCase()}`

    return { buffer, filename }
  }


  async function uploadToUp1(buffer, filename, mimetype) {
    const start = await fetch(`${UP1_BASE}/api/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filename, mimetype, size: buffer.length })
    }).then(r => r.json())

    const md5    = crypto.createHash('md5').update(buffer).digest('base64')
    const signed = await fetch(`${UP1_BASE}/api/upload`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        md5, part: 1,
        region:       start.region,
        size:         buffer.length,
        upload_id:    start.upload_id,
        uri:          start.uri,
        location_url: start.location_url
      })
    }).then(r => r.json())

    const put  = await fetch(signed.url, { method: 'PUT', headers: signed.headers, body: buffer })
    const etag = put.headers.get('etag')

    const done = await fetch(`${UP1_BASE}/api/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename, mimetype,
        size:         buffer.length,
        region:       start.region,
        upload_id:    start.upload_id,
        uri:          start.uri,
        location_url: start.location_url,
        parts: [{ part_number: 1, etag }]
      })
    }).then(r => r.json())

    return done.url
  }

  async function resolveUp1(up1Url) {
    const { data: html } = await axios.get(up1Url, {
      headers: { 'User-Agent': UA, Referer: `${UP1_BASE}/` }
    })

    const download = html.match(/window\.location\.href\s*=\s*"([^"]+)"/)?.[1]
    if (!download) throw new Error('No se encontró enlace de descarga en UP1')

    const filename = html.match(/confirm\("Do you want to download '([^']+)'/)?.[1] || null

    return { filename, download }
  }

  app.get('/download/deezer', async (req, res) => {
    try {
      const { url, format = 'mp3' } = req.query

      if (!url) {
        return res.json({ status: false, error: "Falta parámetro ?url=" })
      }

      if (url.includes('deezer.com')) {
        const id       = getTrackId(url)
        const file     = await downloadTrack(id, format)
        const mimetype = format.toUpperCase() === 'FLAC' ? 'audio/flac' : 'audio/mpeg'

        const up1Url   = await uploadToUp1(file.buffer, file.filename, mimetype)
        const resolved = await resolveUp1(up1Url)

        return res.json({
          status:   true,
          data: {
            filename: file.filename,
            size:     file.buffer.length,
            dl: resolved.download
          }
        })
      }

      throw new Error('URL no soportada. Usa una URL de Deezer.')

    } catch (err) {
      res.json({ status: false, error: err.message })
    }
  })
}