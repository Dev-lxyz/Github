const axios = require('axios')
const cheerio = require('cheerio')

module.exports = function (app) {

  app.get('/search/playstore', async (req, res) => {
    try {
      const { q } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          error: 'Parámetro "q" requerido'
        })
      }

      const url = `https://play.google.com/store/search?q=${encodeURIComponent(q)}&c=apps`

      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        timeout: 15000
      })

      const $ = cheerio.load(data)
      const apps = []

      $('a.Si6A0c.Gy4nib').each((i, el) => {
        if (i >= 5) return false

        const link = 'https://play.google.com' + $(el).attr('href')
        const nombre = $(el).find('.DdYX5').text().trim()
        const desarrollador = $(el).find('.wMUdtb').text().trim()
        const calificacion = $(el).find('span.w2kbF').text().trim()

        apps.push({
          nombre: nombre || 'Sin nombre',
          desarrollador: desarrollador || 'Sin desarrollador',
          calificacion: calificacion || 'Sin calificación',
          link,
          link_desarrollador: desarrollador
            ? `https://play.google.com/store/apps/developer?id=${desarrollador.replace(/\s+/g, '+')}`
            : null,
          img: 'https://files.catbox.moe/dklg5y.jpg'
        })
      })

      if (!apps.length) {
        return res.json({
          status: false,
          error: 'No se encontraron resultados'
        })
      }

      res.json({
        status: true,
        creator: "ɪ'ᴍ sʜᴀᴅᴏᴡ",
        result: apps
      })

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      })
    }
  })

}