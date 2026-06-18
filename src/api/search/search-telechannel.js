module.exports = function (app) {
  const axios = require('axios')
  const cheerio = require('cheerio')

  const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'

  async function getRealTelegramLink(joinUrl) {
    try {
      const { data } = await axios.get(joinUrl, {
        headers: { 'User-Agent': UA },
        timeout: 15000
      })

      const $ = cheerio.load(data)
      const realLink = $('a[href^="tg://resolve"]').attr('href')

      if (realLink) {
        const username = realLink.split('tg://resolve?domain=')[1]
        return `https://t.me/${username}`
      }

    } catch (e) {
      // si falla, devolvemos el join url tal cual
    }

    return joinUrl
  }

  function parseMembers(text) {
    // el sitio junta el numero de miembros con un delta pegado, ej: "19158748−1416329"
    // separamos por el primer caracter no-numerico (+, −, -)
    const clean = String(text || '').trim()
    const match = clean.match(/^([\d.,]+)/)
    return match ? match[1].replace(/[.,]/g, '') : null
  }

  async function searchTelegramChannels(query, resolveLinks = false) {
    try {
      const url = `https://en.tgramsearch.com/?query=${encodeURIComponent(query)}`

      const { data } = await axios.get(url, {
        headers: { 'User-Agent': UA },
        timeout: 15000
      })

      const $ = cheerio.load(data)
      const results = []

      // cada canal es un <a> que apunta a /join/{id}; subimos al contenedor del bloque
      $('a[href^="/join/"]').each((_, el) => {
        const $link = $(el)
        const href = $link.attr('href')
        if (!href) return

        // contenedor del canal: el ancestro mas cercano que tambien tenga la imagen y la descripcion
        const $block = $link.closest('div, article, li')
        if (!$block.length) return

        // evitar procesar el mismo bloque dos veces si hay anidamiento
        if ($block.data('_parsed')) return
        $block.data('_parsed', true)

        const name = $link.text().trim()
        const image = $block.find('img').first().attr('src') || null

        // categorias: links que apuntan a /categories/
        const category = $block
          .find('a[href*="/categories/"]')
          .map((_, c) => $(c).text().trim())
          .get()
          .filter(Boolean)
          .join(', ') || null

        // texto plano del bloque para extraer visibilidad, miembros y descripcion
        const blockText = $block.text()

        const visibility = /^\s*private/i.test(blockText)
          ? 'private'
          : /^\s*public/i.test(blockText)
            ? 'public'
            : null

        // numero de miembros: primer grupo de digitos largo que aparece despues del nombre
        const membersMatch = blockText.match(/([\d][\d.,]{3,})[+\u2212-]/)
        const members = membersMatch ? parseMembers(membersMatch[1]) : null

        // descripcion: parrafo de texto que no sea el nombre, categoria o visibilidad/miembros
        let description = null
        $block.find('p').each((_, p) => {
          const t = $(p).text().trim()
          if (t && t !== name && !description) description = t
        })

        if (!name && !href) return

        results.push({
          name: name || null,
          link: href.startsWith('http') ? href : `https://en.tgramsearch.com${href}`,
          image,
          visibility,
          members,
          description,
          category
        })
      })

      // resolver el link real de t.me solo si se pide explicitamente (es lento: 1 request extra por canal)
      if (resolveLinks) {
        for (const r of results) {
          r.link = await getRealTelegramLink(r.link)
        }
      }

      return results

    } catch (err) {
      return []
    }
  }

  app.get('/search/telegram-channel', async (req, res) => {
    try {
      const { q, resolve } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro 'q'"
        })
      }

      const results = await searchTelegramChannels(q, resolve === 'true' || resolve === '1')

      res.json({
        status: true,
        total: results.length,
        result: results.slice(0, 10)
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}
