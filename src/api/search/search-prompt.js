const https = require("https")

module.exports = function (app) {

  function clean(data) {
    if (!data?.items) return []

    return data.items.map(item => {
      const p = item.prompt || {}
      const a = item.asset || {}

      return {
        id: p.id,
        prompt: p.prompt?.trim() || "",
        title: p.title || "",
        category: p.category || "",
        model: p.modelUsed || "",
        modelVersion: p.modelUsedVersion || "",
        nsfw: p.isNsfw || false,

        stats: {
          views: p.viewCount || 0,
          favorites: p.favCount || 0
        },

        image: {
          url: a.url || a.canonicalUrl || null,
          width: a.width || null,
          height: a.height || null
        },

        createdAt: p.createdAt || null
      }
    })
  }

  function searchPrompts(query, page = 1, pageSize = 5) {
    const body = {
      0: { json: null, meta: { values: ["undefined"], v: 1 } },
      1: { json: null, meta: { values: ["undefined"], v: 1 } },
      2: {
        json: {
          query,
          page,
          pageSize,
          nsfw: false
        }
      }
    }

    const url = "https://prompthero.com/api/trpc/prompt.search?batch=1&input=" +
      encodeURIComponent(JSON.stringify(body))

    return new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          "user-agent": "Mozilla/5.0",
          "accept": "application/json",
          "referer": "https://prompthero.com/"
        }
      }, (res) => {

        let data = ""

        res.on("data", c => data += c)

        res.on("end", () => {
          try {
            const json = JSON.parse(data)
            const raw = json?.[2]?.result?.data?.json
            resolve(clean(raw))
          } catch (e) {
            reject(e)
          }
        })

      }).on("error", reject)
    })
  }

  // ───── ENDPOINT ─────
  app.get("/search/prompthero", async (req, res) => {
    try {
      const { q, limit = 5, page = 1 } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Falta parametro ?q="
        })
      }

      const data = await searchPrompts(q, Number(page), Number(limit))

      return res.json({
        status: true,
        query: q,
        page: Number(page),
        limit: Number(limit),
        total: data.length,
        result: data
      })

    } catch (e) {
      return res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}