module.exports = function (app) {
  const cheerio = require("cheerio")

  async function searchStickerPacks(searchTerm, limit = 10) {
    try {
      const url = `https://getstickerpack.com/stickers?query=${encodeURIComponent(searchTerm)}`

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "text/html",
        },
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const html = await res.text()
      const $ = cheerio.load(html)

      const packs = []

      $(".sticker-pack-cols").each((i, el) => {
        if (packs.length >= limit) return

        const linkTag = $(el).find("a")
        const packUrl = linkTag.attr("href")
        const title = $(el).find(".title").text().trim()
        const author = $(el).find(".username").text().trim() || "Desconocido"
        const trayIcon = $(el).find("img").attr("src")

        if (packUrl && title) {
          packs.push({
            title,
            author,
            pack_url: packUrl.startsWith("http")
              ? packUrl
              : `https://getstickerpack.com${packUrl}`,
            tray_icon: trayIcon,
            stickers: []
          })
        }
      })

      for (const pack of packs) {
        try {
          const resPack = await fetch(pack.pack_url, {
            headers: { "User-Agent": "Mozilla/5.0" },
          })

          if (!resPack.ok) continue

          const htmlPack = await resPack.text()
          const $pack = cheerio.load(htmlPack)

          $pack(".sticker-image").each((i, el) => {
            let url =
              $pack(el).attr("data-src-large") ||
              $pack(el).attr("src")

            if (url) {
              if (url.startsWith("//")) url = "https:" + url
              pack.stickers.push(url)
            }
          })
        } catch (e) {
        }
      }

      return {
        status: true,
        query: searchTerm,
        total: packs.length,
        packs
      }

    } catch (e) {
      return {
        status: false,
        error: e.message
      }
    }
  }

  app.get("/sticker/getsticker", async (req, res) => {
    try {
      const { q, limit } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          error: "Falta parámetro: q"
        })
      }

      const data = await searchStickerPacks(q, Number(limit) || 5)

      return res.json({
        status: true,
        ...data
      })

    } catch (e) {
      return res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })
}