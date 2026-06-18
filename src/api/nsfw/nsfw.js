module.exports = function (app) {

  app.get('/random/nsfw/waifu', async (req, res) => {
    try {
      const { nsfw, limit } = req.query

      const isNsfw = nsfw === 'true' || nsfw === '1'
      const count = Math.min(Math.max(parseInt(limit) || 1, 1), 10)

      const params = new URLSearchParams({
        isNsfw: String(isNsfw),
        orderBy: "Random",
        page: "1",
        pageSize: String(count)
      })

      const apiRes = await fetch(`https://api.waifu.im/images?${params}`)
      const data = await apiRes.json()

      if (!apiRes.ok || !data?.items?.length) {
        return res.json({
          status: false,
          error: "No se pudo obtener imagen"
        })
      }

      const urls = data.items.map(item => item.url)
      res.json({
        status: true,
        result: count === 1 ? urls[0] : urls
      })

    } catch (err) {
      res.json({
        status: false,
        error: err.message
      })
    }
  })

}
