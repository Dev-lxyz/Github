module.exports = function (app) {
  const crypto = require('crypto')

  const FLAC_BASE =
    'https://flacdownloader.com'

  const UP1_BASE =
    'https://up1.sr00.workers.dev'

  const DOWNLOAD_ACCESS =
    'l@p*gute)77=g5clebcp4lz#=x%(*rwg+ku0_)bh=&%6wg!a'

  const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36'

  async function searchTrack(q) {

    const res = await fetch(
      `${FLAC_BASE}/flac/search?query=${encodeURIComponent(q)}`,
      {
        headers: {
          Accept: '*/*',
          Referer: `${FLAC_BASE}/`,
          'User-Agent': USER_AGENT
        }
      }
    )

    const json = await res.json()

    return json.data?.[0]

  }

  async function getToken(id, format) {

    const res = await fetch(
      `${FLAC_BASE}/flac/download-token?t=${id}&f=${format}`,
      {
        headers: {
          Accept: '*/*',
          Referer: `${FLAC_BASE}/`,
          'User-Agent': USER_AGENT,
          'x-download-access': DOWNLOAD_ACCESS
        }
      }
    )

    return res.json()

  }

  async function downloadTrack(id, format) {

    const token =
      await getToken(id, format)

    const res = await fetch(
      `${FLAC_BASE}/flac/download?t=${id}&f=${format}&token=${token.token}&expires=${token.expires}`,
      {
        headers: {
          Accept: '*/*',
          Referer: `${FLAC_BASE}/`,
          'User-Agent': USER_AGENT
        }
      }
    )

    const buffer =
      Buffer.from(
        await res.arrayBuffer()
      )

    return {
      buffer,
      filename:
        res.headers
          .get('content-disposition')
          ?.match(/filename="?([^"]+)/i)?.[1] ||
        `${id}.${format.toLowerCase()}`
    }

  }

  async function uploadFile(
    buffer,
    filename,
    mimetype
  ) {

    const start =
      await fetch(
        `${UP1_BASE}/api/start`,
        {
          method: 'POST',
          headers: {
            'content-type':
              'application/json'
          },
          body: JSON.stringify({
            filename,
            mimetype,
            size: buffer.length
          })
        }
      ).then(v => v.json())

    const md5 =
      crypto
        .createHash('md5')
        .update(buffer)
        .digest('base64')

    const signed =
      await fetch(
        `${UP1_BASE}/api/upload`,
        {
          method: 'POST',
          headers: {
            'content-type':
              'application/json'
          },
          body: JSON.stringify({
            md5,
            part: 1,
            region: start.region,
            size: buffer.length,
            upload_id: start.upload_id,
            uri: start.uri,
            location_url:
              start.location_url
          })
        }
      ).then(v => v.json())

    const put =
      await fetch(
        signed.url,
        {
          method: 'PUT',
          headers: signed.headers,
          body: buffer
        }
      )

    const etag =
      put.headers.get('etag')

    return fetch(
      `${UP1_BASE}/api/complete`,
      {
        method: 'POST',
        headers: {
          'content-type':
            'application/json'
        },
        body: JSON.stringify({
          filename,
          mimetype,
          size: buffer.length,
          region: start.region,
          upload_id: start.upload_id,
          uri: start.uri,
          location_url:
            start.location_url,
          parts: [
            {
              part_number: 1,
              etag
            }
          ]
        })
      }
    ).then(v => v.json())

  }

  async function deezer(
    q,
    format = 'FLAC'
  ) {

    const track =
      await searchTrack(q)

    if (!track)
      throw new Error(
        'No encontré resultados'
      )

    const file =
      await downloadTrack(
        track.id,
        format
      )

    const upload =
      await uploadFile(
        file.buffer,
        file.filename,
        format === 'FLAC'
          ? 'audio/flac'
          : 'audio/mpeg'
      )

    return {
      title:
        track.title,
      artist:
        track.artist?.name,
      album:
        track.album?.title,
      duration:
        track.duration,
      cover:
        track.album?.cover_xl,
      deezer_url:
        track.link,
      format,
      download: {
        url:
          upload.url,
        filename:
          file.filename,
        size:
          file.buffer.length
      }
    }

  }

  app.get('/api/play/deezer', async (req, res) => {
    try {

      const {
        q,
        format = 'FLAC'
      } = req.query

      if (!q) {
        return res.json({
          status: false,
          error:
            'Falta parametro ?q='
        })
      }

      const result =
        await deezer(
          q,
          format
        )

      res.json({
        status: true,
        data: result
      })

    } catch (err) {

      res.json({
        status: false,
        error:
          err.message
      })

    }

  })

}