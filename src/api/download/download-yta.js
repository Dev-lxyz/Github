module.exports = function (app) {
  const axios = require("axios")
  const { CookieJar } = require("tough-cookie")
  const { wrapper } = require("axios-cookiejar-support")

  const BASE_URL = "https://id-y2mate.com"

  function createClient() {
    const jar = new CookieJar()

    return wrapper(axios.create({
      jar,
      withCredentials: true,
      timeout: 20000,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/147.0.0.0 Mobile Safari/537.36",
        "accept": "*/*",
        "origin": BASE_URL,
        "referer": `${BASE_URL}/`,
        "x-requested-with": "XMLHttpRequest"
      }
    }))
  }

  function compactAvailable(links) {
    const result = {}

    for (const [type, group] of Object.entries(links || {})) {
      for (const [id, item] of Object.entries(group || {})) {
        const format = item.f || type
        const quality = item.q || id

        if (!result[format]) result[format] = []
        if (!result[format].includes(quality))
          result[format].push(quality)
      }
    }

    return result
  }

  function pickFormat(links, type = "mp3", quality = "128kbps") {
    const group = links?.[type]

    if (!group) return null

    const items = Object.entries(group).map(([id, data]) => ({
      id,
      ...data
    }))

    return (
      items.find(v => v.q === quality) ||
      items.find(v => v.q === "auto") ||
      items[0]
    )
  }

  function findDownloadUrl(data) {
    if (!data) return null

    if (typeof data === "string") {
      const m = data.match(/https?:\/\/[^\s"'<>]+/i)
      return m ? m[0] : null
    }

    if (typeof data !== "object") return null

    for (const value of Object.values(data)) {
      const found = findDownloadUrl(value)
      if (found) return found
    }

    return null
  }

  async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  app.get("/download/ytmp3", async (req, res) => {
    try {
      const { url, quality = "128kbps" } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta parámetro url"
        })
      }

      const api = createClient()

      await api.get(`${BASE_URL}/`)

      const analyze = await api.post(
        `${BASE_URL}/mates/analyzeV2/ajax`,
        new URLSearchParams({
          k_query: url,
          k_page: "home",
          hl: "en",
          q_auto: "0"
        }).toString(),
        {
          headers: {
            "content-type": "application/x-www-form-urlencoded"
          }
        }
      )

      const detail = analyze.data

      if (detail?.status !== "ok") {
        return res.status(500).json({
          status: false,
          message: "No se pudo analizar el video"
        })
      }

      const selected = pickFormat(
        detail.links,
        "mp3",
        quality
      )

      if (!selected?.k) {
        return res.status(404).json({
          status: false,
          message: "Calidad no disponible",
          available: compactAvailable(detail.links)
        })
      }

      const convert = await api.post(
        `${BASE_URL}/mates/convertV2/index`,
        new URLSearchParams({
          vid: detail.vid,
          k: selected.k
        }).toString(),
        {
          headers: {
            "content-type": "application/x-www-form-urlencoded"
          }
        }
      )

      let dl = findDownloadUrl(convert.data)

      if (!dl && convert.data?.b_id) {
        for (let i = 0; i < 55; i++) {
          await sleep(1000)

          const poll = await api.post(
            `${BASE_URL}/mates/convertV2/pool`,
            new URLSearchParams({
              b_id: convert.data.b_id
            }).toString(),
            {
              headers: {
                "content-type": "application/x-www-form-urlencoded"
              }
            }
          )

          dl = findDownloadUrl(poll.data)

          if (dl) break
        }
      }

      return res.json({
        status: !!dl,
        data: {
          title: detail.title,
          videoId: detail.vid,
          duration: detail.t,
          quality: selected.q,
          format: selected.f,
          size: selected.size,
          dl,
          available: compactAvailable(detail.links)
        }
      })

    } catch (e) {
      return res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })
}