module.exports = function (app) {
  const axios = require('axios')

  async function generateScreenshot(url) {
    if (!url.startsWith('https://'))
      throw new Error('Invalid url. URL must start with https://')

    const payload = {
      url,
      browserWidth: 1920,
      browserHeight: 1080,
      fullPage: false,
      deviceScaleFactor: 1,
      format: 'png'
    }

    const { data } = await axios.post(
      'https://gcp.imagy.app/screenshot/createscreenshot',
      payload,
      {
        headers: {
          'content-type': 'application/json',
          referer: 'https://imagy.app/full-page-screenshot-taker/',
          'user-agent':
            'Mozilla/5.0 (Linux; Android 10) Chrome/137.0.0.0 Mobile Safari/537.36'
        },
        timeout: 20000
      }
    )

    if (!data?.fileUrl)
      throw new Error('Failed to generate screenshot')

    return data.fileUrl
  }

  app.get('/tools/ssweb', async (req, res) => {
    try {
      const { url } = req.query

      if (!url)
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro 'url'"
        })

      const imageUrl = await generateScreenshot(url)

      res.json({
        status: true,
        result: {
          url: imageUrl,
          target: url
        },
        generated_at: new Date().toISOString()
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })
}