const axios = require('axios')

module.exports = function (app) {

  async function bluearchive() {
    const { data } = await axios.get(
      'https://raw.githubusercontent.com/rynxzyy/blue-archive-r-img/refs/heads/main/links.json',
      { timeout: 15000 }
    )

    if (!Array.isArray(data) || !data.length)
      throw new Error('Lista de imágenes vacía')

    const index = Math.floor(Math.random() * data.length)
    const url = data[index]
    let size = null
    try {
      const head = await axios.head(url, { timeout: 10000 })
      size = head.headers['content-length'] ? Number(head.headers['content-length']) : null
    } catch {
      size = null
    }

    return {
      index,
      total: data.length,
      url,
      size
    }
  }

  app.get('/random/ba', async (req, res) => {
    try {
      const result = await bluearchive()

      res.json({
        status: true,
        result: {
          image: result.url,
          count: `${result.index + 1}/${result.total}`,
          size: result.size
        },
        timestamp: Date.now()
      })
    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message
      })
    }
  })
}