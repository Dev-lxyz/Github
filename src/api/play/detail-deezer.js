module.exports = function (app) {
  const axios = require('axios')

  async function up1Detail(url) {

    const { data: html } =
      await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer':
            'https://up1.sr00.workers.dev/'
        },
        timeout: 15000
      })

    const downloadMatch =
      html.match(
        /window\.location\.href\s*=\s*"([^"]+)"/
      )

    if (!downloadMatch) {
      throw new Error(
        'No se encontró enlace real'
      )
    }

    const fileMatch =
      html.match(
        /confirm\("Do you want to download '([^']+)'/
      )

    const download =
      downloadMatch[1]

    const filename =
      fileMatch?.[1] ||
      null

    let size = null

    try {

      const head =
        await axios.head(download)

      const bytes =
        Number(
          head.headers['content-length']
        ) || 0

      if (bytes) {
        size =
          (
            bytes /
            1024 /
            1024
          ).toFixed(2) + ' MB'
      }

    } catch {}

    return {
      filename,
      download,
      size
    }

  }

  app.get('/api/play/detail-deezer', async (req, res) => {
    try {

      const { url } = req.query

      if (!url) {
        return res.json({
          status: false,
          error:
            'Falta parametro ?url='
        })
      }

      const result =
        await up1Detail(url)

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