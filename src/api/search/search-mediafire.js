const axios = require("axios")

module.exports = function (app) {

  async function searchMediafire(query, num = 10) {
    const cx = "e500c3a7a523b49df" // mismo CSE que usas en reels

    const ins = axios.create({
      timeout: 30000,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 16; SM-F966B Build) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        "x-client-data": "CJDjygE="
      }
    })

    // 1. obtener config + token
    const { data: init } = await ins.get("https://cse.google.com/cse.js", { params: { cx } })
    const cfg_ = init.match(/}\)\(({[\s\S]*?})\);/)
    if (!cfg_?.[1]) throw new Error("No se pudo obtener config CSE")
    const cfg = JSON.parse(cfg_[1])

    // 2. buscar en mediafire.com
    const params = {
      rsz:        "filtered_cse",
      num,
      hl:         "es",
      source:     "gcsc",
      cselibv:    cfg.cselibVersion,
      cx,
      q:          `site:mediafire.com ${query}`,
      safe:       "off",
      cse_tok:    cfg.cse_token,
      lr:         "",
      cr:         "",
      gl:         "us",
      filter:     0,
      sort:       "",
      as_oq:      "",
      as_sitesearch: "mediafire.com",
      exp:        "cc,apo",
      oq:         "",
      callback:   "google.search.cse.api11171",
      rurl:       Buffer.from("aHR0cHM6Ly93d3cubWVkaWFmaXJlLmNvbS8=", "base64").toString()
    }

    const { data: raw } = await ins.get("https://cse.google.com/cse/element/v1", { params })
    const jsonStr  = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)
    const jsonData = JSON.parse(jsonStr)

    return (jsonData.results || []).map(item => {
      const meta = item.richSnippet?.metatags || {}

      // extraer extensión del título o URL
      const url    = item.url || ""
      const title  = meta.ogTitle || item.title || ""
      const extMatch = (title + url).match(/\.(zip|rar|mp3|mp4|pdf|apk|exe|7z|mkv|docx?|xlsx?|png|jpg|iso)\b/i)
      const ext    = extMatch ? extMatch[1].toLowerCase() : null

      // autor — aparece a veces en descripción o snippet
      const snippet = item.contentNoFormatting || item.snippet || ""
      const authorMatch = snippet.match(/(?:by|uploaded by|author[:\s]+)([^\n|·•\-,]+)/i)
      const author = authorMatch ? authorMatch[1].trim() : null

      // fecha — Google a veces la pone en richSnippet
      const date = item.richSnippet?.metatags?.articlePublishedTime
        || item.richSnippet?.metatags?.ogUpdatedTime
        || null

      return {
        title:       title.replace(/\s*[-|]\s*MediaFire$/i, "").trim(),
        link:        url,
        description: snippet,
        author:      author || null,
        uploaded:    date   || null,
        type:        ext    || null,
        thumbnail:   meta.ogImage || null
      }
    })
  }

  // GET /search/mediafire?text=minecraft&num=10
  app.get("/search/mediafire", async (req, res) => {
    try {
      const { text, num = 10 } = req.query

      if (!text?.trim())
        return res.status(400).json({ status: false, message: "Falta ?text=" })

      const results = await searchMediafire(text.trim(), Number(num))

      return res.json({
        status:  true,
        query:   text,
        total:   results.length,
        results
      })

    } catch (e) {
      return res.status(500).json({ status: false, message: e.message })
    }
  })

}
