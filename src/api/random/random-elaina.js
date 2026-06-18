module.exports = function (app) {
  const fetch = require('node-fetch')

  const SOURCES = [
    'https://danbooru.donmai.us/posts.json?tags=elaina_(majo_no_tabitabi)+rating:safe&limit=50',
    'https://api.waifu.im/search?included_tags=witch&is_nsfw=false'
  ]

  function getDanbooruImage(posts) {
    if (!posts || !posts.length) return null

    const valid = posts.filter(p => p.file_url)
    if (!valid.length) return null

    const pick = valid[Math.floor(Math.random() * valid.length)]
    return pick.file_url.startsWith('http')
      ? pick.file_url
      : 'https://danbooru.donmai.us' + pick.file_url
  }

  function parse(json) {
    if (Array.isArray(json)) {
      return getDanbooruImage(json)
    }

    if (json.images && json.images[0]?.url) {
      return json.images[0].url
    }

    return null
  }

  async function getElaina() {
    try {
      const r = await fetch(SOURCES[0])
      const json = await r.json()

      const img = parse(json)
      if (img) return img
    } catch {}

    try {
      const r = await fetch(SOURCES[1])
      const json = await r.json()

      const img = parse(json)
      if (img) return img
    } catch {}

    throw new Error('No image')
  }

  app.get('/random/elaina', async (req, res) => {
    try {
      const img = await getElaina()

      const image = await fetch(img)

      res.setHeader(
        'Content-Type',
        image.headers.get('content-type') || 'image/jpeg'
      )

      image.body.pipe(res)
    } catch (e) {
      res.status(500).send('Error obteniendo Elaina')
    }
  })
}