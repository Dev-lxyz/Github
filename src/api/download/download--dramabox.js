const axios = require('axios')
const cheerio = require('cheerio')

async function getVideoFromEpisode(url) {
  try {
    const { data } = await axios.get(url, { timeout: 20000 })

    // buscar m3u8
    const m3u8 = data.match(/https?:\/\/[^"' ]+\.m3u8/)
    if (m3u8) {
      return {
        type: 'm3u8',
        url: m3u8[0]
      }
    }

    // buscar mp4
    const mp4 = data.match(/https?:\/\/[^"' ]+\.mp4/)
    if (mp4) {
      return {
        type: 'mp4',
        url: mp4[0]
      }
    }

    return null
  } catch {
    return null
  }
}

async function dramaboxEpisodes(url) {
  const { data: html } = await axios.get(url, { timeout: 20000 })
  const $ = cheerio.load(html)

  const episodes = []

  $('.relatedEpisode_listItem__PNXFG').each((_, el) => {
    const style = $(el).attr('style')
    if (style && style.includes('display:none')) return

    const link = $(el).find('a.relatedEpisode_rightIntro__y7zZA')
    const href = link.attr('href')
    if (!href) return

    episodes.push({
      title: link.find('.relatedEpisode_title__eygbR').text().trim(),
      episode: link.find('.relatedEpisode_pageNum__W_ulP').text().trim(),
      url: 'https://www.dramaboxdb.com' + href
    })
  })

  // sacar video uno por uno
  for (const ep of episodes) {
    ep.video = await getVideoFromEpisode(ep.url)
  }

  return episodes
}

module.exports = function (app) {
  app.get('/download/dramabox', async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          error: 'Falta parámetro: url'
        })
      }

      if (!/dramaboxdb\.com/i.test(url)) {
        return res.status(400).json({
          status: false,
          error: 'URL no válida de Dramabox'
        })
      }

      const episodes = await dramaboxEpisodes(url)

      res.json({
        status: true,
        total: episodes.length,
        episodes
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })
}