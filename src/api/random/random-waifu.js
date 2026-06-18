module.exports = function (app) {

  app.get('/random/waifu', async (req, res) => {
    try {
      const { nsfw, limit } = req.query

      const isNsfw = nsfw === 'true' || nsfw === '1'
      const pageSize = Math.min(Math.max(parseInt(limit) || 10, 1), 100)

      const params = new URLSearchParams({
        isNsfw: String(isNsfw),
        orderBy: "Random",
        page: "1",
        pageSize: String(pageSize)
      })

      const apiRes = await fetch(`https://api.waifu.im/images?${params}`)
      const data = await apiRes.json()

      if (!apiRes.ok || !data?.items) {
        return res.json({
          status: false,
          error: "No se pudo obtener imagenes"
        })
      }

      res.json({
        status: true,
        nsfw: isNsfw,
        total: data.items.length,
        data: data.items.map(item => item.url)
      })

    } catch (err) {
      res.json({
        status: false,
        error: err.message
      })
    }
  })

}
