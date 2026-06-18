/*const { fbDownload } = require("../../lib/fb")

module.exports = function (app) {

  app.get("/download/facebook/v3", async (req, res) => {
    try {

      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Missing parameter: url"
        })
      }

      const result = await fbDownload(url)

      if (!result?.code || !result?.data) {
        return res.status(500).json({
          status: false,
          message: "Scraper error",
          result
        })
      }

      return res.json({
        status: true,
        result
      })

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message
      })
    }
  })

}*/

module.exports = function (app) {

  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

  const api = "https://v3.fdownloader.net/api/ajaxSearch"

  function decodeEntity(s) {
    return String(s)
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
  }

  function parseToken(snapUrl) {
    const m = snapUrl.match(/token=([^&]+)/)
    if (!m) return {}

    const jwt = m[1].split(".")
    const payload = jwt.length === 3 ? jwt[1] : jwt[0]

    let data = {}
    try {
      data = JSON.parse(Buffer.from(payload, "base64url").toString())
    } catch {}

    const innerUrl = data.url ? decodeURIComponent(data.url) : ""

    let duration = null

    const efgM = innerUrl.match(/efg=([^&]+)/)
    if (efgM) {
      try {
        const efg = JSON.parse(
          Buffer.from(decodeURIComponent(efgM[1]), "base64").toString()
        )
        if (efg.duration_s) duration = efg.duration_s
      } catch {}
    }

    return {
      directUrl: innerUrl,
      filename: data.filename,
      expiresAt: data.exp ? new Date(data.exp * 1000).toISOString() : null,
      duration
    }
  }

  app.get("/download/facebook/v3", async (req, res) => {

    try {

      const { url, lang = "id" } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta ?url="
        })
      }

      const body = new URLSearchParams({
        q: url,
        lang,
        cftoken: ""
      })

      const response = await fetch(api, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "user-agent": ua,
          origin: "https://fdownloader.net",
          referer: "https://fdownloader.net/",
          "x-requested-with": "XMLHttpRequest"
        },
        body: body.toString()
      })

      if (!response.ok) {
        return res.status(response.status).json({
          status: false,
          message: `HTTP ${response.status}`
        })
      }

      const j = await response.json()

      if (j.status !== "ok" || !j.data) {
        return res.status(500).json({
          status: false,
          message: j.mess || "No data"
        })
      }

      // 🔥 DOM parse dinámico (jsdom import)
      const { JSDOM } = await import("jsdom")
      const doc = new JSDOM(j.data).window.document

      const title =
        ((doc.querySelector("h3") || {}).textContent || "Facebook Video").trim()

      const desc =
        ((doc.querySelector(".content p") || {}).textContent || "").trim()

      const thumb = (doc.querySelector(".image-fb img") || {}).src || ""

      const vidEl = doc.querySelector("#vid")
      const poster = vidEl ? vidEl.getAttribute("poster") || "" : ""

      const hasAudio = !/no sound|no audio/i.test(j.data)

      let videoDuration = null
      const medias = []

      doc.querySelectorAll("table tbody tr").forEach(tr => {
        const tds = tr.querySelectorAll("td")
        if (tds.length < 3) return

        const quality = (tds[0].textContent || "").trim()
        const anchor = tds[tds.length - 1].querySelector("a[href]")
        if (!anchor) return

        const link = decodeEntity(anchor.href || anchor.getAttribute("href"))
        if (!link.startsWith("http")) return

        const meta = parseToken(link)

        if (meta.duration && !videoDuration) {
          videoDuration = meta.duration
        }

        medias.push({
          quality,
          url: link,
          directUrl: meta.directUrl || null,
          filename: meta.filename || null,
          expiresAt: meta.expiresAt || null
        })
      })

      return res.json({
        status: true,
        result: {
          fbId: (doc.querySelector("#FbId") || {}).value || null,
          title,
          desc: desc || null,
          thumb,
          poster: poster || thumb,
          hasAudio,
          duration: videoDuration,
          totalFormats: medias.length,
          medias
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