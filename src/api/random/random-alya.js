const axios = require('axios')
const FormData = require('form-data')
const { createApiKeyMiddleware } = require('./../../lib/apikey.js')

module.exports = function (app) {

  const SOURCES = [
    'https://danbooru.donmai.us/posts.json?tags=alisa_mikhailovna_kujou+rating:safe&limit=50'
  ]

  function getDanbooruImage(posts) {
    const valid = posts.filter(p => p.file_url)

    if (!valid.length) return null

    const pick = valid[Math.floor(Math.random() * valid.length)]

    return {
      image: pick.file_url.startsWith('http')
        ? pick.file_url
        : 'https://danbooru.donmai.us' + pick.file_url,
      rating: pick.rating || 'unknown'
    }
  }

  function parse(json) {
    if (Array.isArray(json)) {
      return getDanbooruImage(json)
    }

    if (json.images && json.images[0]) {
      const img = json.images[0]

      return {
        image: img.url,
        link: ''
      }
    }

    return null
  }

  async function uploadToCloud(imageUrl) {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    })

    const form = new FormData()

    form.append('file', response.data, {
      filename: 'alya.jpg'
    })

    const upload = await axios.post(
      'https://cloud-yume.onrender.com/api/upload',
      form,
      {
        headers: form.getHeaders(),
        timeout: 15000
      }
    )

    return upload.data?.result?.url || null
  }

  app.get('/random/alya', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { cloud } = req.query

      const useCloud = String(cloud).toLowerCase() === 'true'

      const raw = await Promise.any(
        SOURCES.map(url =>
          axios.get(url, { timeout: 8000 })
            .then(r => parse(r.data))
        )
      )

      if (!raw || !raw.image) {
        throw new Error('No image found')
      }

      let finalUrl = raw.image

      if (useCloud) {
        const uploadedUrl = await uploadToCloud(raw.image)

        if (!uploadedUrl) {
          throw new Error('Upload failed')
        }

        finalUrl = uploadedUrl
      }

      res.json({
        status: true,
        result: {
          character: "Alisa Mikhailovna Kujou",
          image: finalUrl,
          rating: raw.rating || 'unknown',
          source: useCloud ? 'cloud' : 'original'
        }
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: 'Error obteniendo/subiendo imagen',
        message: e.message
      })
    }
  })
}