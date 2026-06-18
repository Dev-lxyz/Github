const cheerio = require("cheerio")

module.exports = function (app) {

  app.get('/tools/youtube-image', async (req, res) => {
    try {
      const { url, mode = "thumb" } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro ?url="
        })
      }

      const configMap = {
        profile: {
          page: "https://imageyoutube.com/profile-photo-download/",
          endpoint: "https://imageyoutube.com/profile-photo-download/imgyt",
          extra: { mcountry: "en" },
          field: "v"
        },
        thumb: {
          page: "https://imageyoutube.com/thumbnail-download/",
          endpoint: "https://imageyoutube.com/thumbnail-download/imgyt",
          extra: {
            usertimezone: "Asia/Jakarta",
            device: "computer"
          },
          field: "v"
        },
        banner: {
          page: "https://imageyoutube.com/banner-download/",
          endpoint: "https://imageyoutube.com/banner-download/imgyt",
          extra: { mcountry: "en" },
          field: "v"
        },
        comment: {
          page: "https://imageyoutube.com/comment-images/",
          endpoint: "https://imageyoutube.com/comment-images/imgyt",
          extra: {
            usertimezone: "Asia/Jakarta",
            device: "computer"
          },
          field: "v"
        },
        giveaway: {
          page: "https://imageyoutube.com/giveaway/",
          endpoint: "https://imageyoutube.com/giveaway/picker",
          extra: {
            kacyorumsecilsin: "1",
            yedeksayisi: "1",
            usertimezone: "Asia/Jakarta",
            device: "computer",
            lang: "en"
          },
          field: "videoId"
        }
      }

      const cfg = configMap[mode]

      if (!cfg) {
        return res.status(400).json({
          status: false,
          message: "Mode inválido"
        })
      }

      // 🔥 1. GET página para CSRF + cookie
      const page = await fetch(cfg.page, {
        headers: { "user-agent": "Mozilla/5.0" }
      })

      const cookie = page.headers.get("set-cookie")?.split(";")[0] || ""
      const htmlPage = await page.text()

      const $ = cheerio.load(htmlPage)
      const csrf = $("input[name=csrf_token]").val()

      // 🔥 2. POST request real
      const body = new URLSearchParams({
        [cfg.field]: url,
        csrf_token: csrf,
        ...cfg.extra
      })

      const response = await fetch(cfg.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
          cookie,
          origin: "https://imageyoutube.com",
          referer: cfg.page,
          "user-agent": "Mozilla/5.0"
        },
        body
      })

      const html = await response.text()

      // 🔥 PARSERS
      function parseDefault(html) {
        const $ = cheerio.load(html)

        const result = {
          profile: [],
          banner: [],
          thumbnails: [],
          frames: {
            start: [],
            middle: [],
            end: []
          }
        }

        $("section").each((_, el) => {
          const title = $(el).find("h5").text().toLowerCase()

          const items = []
          $(el).find("a[href]").each((_, a) => {
            const href = $(a).attr("href")
            const label =
              $(a).text().trim() ||
              $(a).find("button").text().trim() ||
              null

            if (href) items.push({ resolution: label, url: href })
          })

          if (!items.length) return

          if (title.includes("profile")) result.profile = items
          else if (title.includes("banner")) result.banner = items
          else if (title.includes("player background")) result.thumbnails = items
          else if (title.includes("start frame")) result.frames.start = items
          else if (title.includes("middle frame")) result.frames.middle = items
          else if (title.includes("end frame")) result.frames.end = items
        })

        return result
      }

      function parseComment(html) {
        const $ = cheerio.load(html)

        const images = []

        $(".youtube-image-options a").each((_, el) => {
          const url = $(el).attr("href")
          const res = $(el).find("button").text().trim()

          if (url) images.push({ resolution: res, url })
        })

        return { comments: images }
      }

      function parseGiveaway(html) {
        const $ = cheerio.load(html)

        const winners = []
        const backups = []

        $(".winner-card").each((_, el) => {
          const name = $(el).find(".card-title").first().text().trim()
          const comment = $(el).find(".card-text").text().trim()
          const channel = $(el).find("a[href*='channel']").attr("href") || null
          const profile = $(el).find("img").first().attr("src") || null

          const data = { name, comment, channel, profile }

          if ($(el).hasClass("backup-winner")) backups.push(data)
          else winners.push(data)
        })

        const totalComments = $(".total-comments-sayisi").text().trim()

        return {
          totalComments,
          winners,
          backupWinners: backups
        }
      }

      let result

      if (mode === "comment") result = parseComment(html)
      else if (mode === "giveaway") result = parseGiveaway(html)
      else result = parseDefault(html)

      return res.json({
        status: true,
        mode,
        result
      })

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message
      })
    }
  })

}