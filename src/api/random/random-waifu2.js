module.exports = function (app) {
  const fetch = require('node-fetch')

  const SOURCES = [
    'https://api.waifu.pics/sfw/waifu',
    'https://nekos.best/api/v2/waifu'
  ]

  function parse(json) {
    if (!json) return null

    if (json.url) return json.url

    if (json.results && json.results[0]?.url) {
      return json.results[0].url
    }

    if (json.images && json.images[0]?.url) {
      return json.images[0].url
    }

    return null
  }

  async function getWaifuFast() {
    const randomApi = SOURCES[Math.floor(Math.random() * SOURCES.length)]

    try {
      const r = await fetch(randomApi, { timeout: 5000 })
      const json = await r.json()

      const img = parse(json)

      if (img) return img
    } catch {}

    const requests = SOURCES.slice(0, 4).map(url =>
      fetch(url)
        .then(r => r.json())
        .then(parse)
        .catch(() => null)
    )

    const results = await Promise.all(requests)
    const valid = results.filter(Boolean)

    if (!valid.length) throw new Error('No image')

    return valid[Math.floor(Math.random() * valid.length)]
  }

  app.get('/random/waifu/v2', async (req, res) => {
    try {
      const img = await getWaifuFast()

      const image = await fetch(img)

      res.setHeader(
        'Content-Type',
        image.headers.get('content-type') || 'image/jpeg'
      )

      image.body.pipe(res)
    } catch (e) {
      res.status(500).send('Error obteniendo waifu')
    }
  })
}