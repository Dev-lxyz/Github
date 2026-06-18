const fetch = require("node-fetch")

module.exports = function (app) {

  app.get("/search/rule34", async (req, res) => {
    try {
      const { q, limit = 10 } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          error: "Falta parámetro: q"
        })
      }

      const tag = q.replace(/\s+/g, "_")

      const url =
        `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1` +
        `&tags=${encodeURIComponent(tag)}` +
        `&api_key=a4e807dd6d4c9e55768772996946e4074030ec02c49049d291e5edb8808a97b004190660b4b36c3d21699144c823ad93491d066e73682a632a38f9b6c3cf951b` +
        `&user_id=5753302`

      const r = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        }
      })

      const type = r.headers.get("content-type") || ""
      if (!r.ok || !type.includes("json")) {
        throw new Error("Rule34 no devolvió JSON")
      }

      const json = await r.json()

      const data = Array.isArray(json)
        ? json
        : json?.post || json?.data || []

      let valid = data
        .map(i => i?.file_url || i?.sample_url || i?.preview_url)
        .filter(u => typeof u === "string" && /\.(jpe?g|png|gif|mp4)$/i.test(u))

      if (!valid.length) {
        return res.json({
          status: false,
          error: "Sin resultados"
        })
      }

      valid = valid.sort(() => Math.random() - 0.5).slice(0, Number(limit))

      res.json({
        status: true,
        query: tag,
        count: valid.length,
        results: valid.map(url => ({
          type: url.endsWith(".mp4") ? "video" : "image",
          url
        }))
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })

}