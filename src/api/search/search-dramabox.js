const axios = require('axios')
const cheerio = require('cheerio')

async function dramaboxSearch(query) {
  const { data: html } = await axios.get(
    'https://www.dramaboxdb.com/in/search',
    {
      params: { searchValue: query },
      timeout: 20000
    }
  )

  const $ = cheerio.load(html)
  const results = []

  $('.SearchBookList_imageItem1Wrap__dvPmc').each((_, el) => {
    const a = $(el).find('a')
    const img = $(el).find('img')

    const title = a.text().trim()
    const href = a.attr('href')

    if (!title || !href) return

    results.push({
      title,
      url: 'https://www.dramaboxdb.com' + href,
      image: img.attr('src') || null
    })
  })

  return results
}

module.exports = function (app) {
  app.get('/search/dramabox', async (req, res) => {
    try {
      const { q } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          error: 'Falta parámetro: q'
        })
      }

      const data = await dramaboxSearch(q)

      res.json({
        status: true,
        query: q,
        count: data.length,
        results: data
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })
}