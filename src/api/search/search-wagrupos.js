const axios      = require("axios")
const cheerio    = require("cheerio")
const { wrapper } = require("axios-cookiejar-support")
const { CookieJar } = require("tough-cookie")

module.exports = function (app) {

  // ── cliente con cookie jar ────────────────────────────────────────────────
  function makeClient() {
    const jar    = new CookieJar()
    const client = wrapper(axios.create({
      jar,
      timeout: 10000,
      headers: {
        "user-agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "connection":      "keep-alive",
        "upgrade-insecure-requests": "1",
        "sec-fetch-dest":  "document",
        "sec-fetch-mode":  "navigate",
        "sec-fetch-site":  "none",
        "sec-fetch-user":  "?1",
      }
    }))
    return { client, jar }
  }

  // ── visitar página principal para obtener cookies ────────────────────────
  async function initSession(client, query) {
    await client.get(
      `https://groupsor.link/group/search?keyword=${encodeURIComponent(query)}`,
      { maxRedirects: 5 }
    )
  }

  // ── buscar grupos ─────────────────────────────────────────────────────────
  async function searchGroups(query, groupNo = 0) {
    const { client } = makeClient()

    // 1. visitar la página primero → el sitio setea cookies
    await initSession(client, query)

    const slug = query.trim().replace(/\s+/g, "-")

    // 2. POST con las cookies ya seteadas
    const { data: html, status } = await client.post(
      `https://groupsor.link/group/searchmore/${encodeURIComponent(slug)}`,
      new URLSearchParams({ group_no: String(groupNo) }).toString(),
      {
        headers: {
          "content-type":    "application/x-www-form-urlencoded; charset=UTF-8",
          "accept":          "*/*",
          "accept-language": "en-US,en;q=0.9",
          "origin":          "https://groupsor.link",
          "referer":         `https://groupsor.link/group/search?keyword=${encodeURIComponent(query)}`,
          "x-requested-with": "XMLHttpRequest",
          "sec-fetch-dest":  "empty",
          "sec-fetch-mode":  "cors",
          "sec-fetch-site":  "same-origin",
        }
      }
    )

    if (status !== 200) throw new Error(`HTTP ${status}`)

    const $      = cheerio.load(html)
    const groups = []

    $("#results .maindiv, .maindiv").each((_, el) => {
      const div = $(el)

      const inviteHref = div.find('a[href*="/group/invite/"]').first().attr("href")
      if (!inviteHref) return

      const name     = div.find("img.image").attr("alt")?.trim() || null
      const image    = div.find("img.image").attr("src") || null
      const category = div.find('a[href*="/group/category/"]').first().text().trim() || null
      const country  = div.find('a[href*="/group/country/"]').first().text().trim() || null

      let description = div.find("p.descri").first().text().trim() || ""
      description = description.replace(/\s*\.\.\.\s*continue reading$/i, "")

      groups.push({
        name,
        link: inviteHref.replace(
          /^https?:\/\/groupsor\.link\/group\/invite\//,
          "https://chat.whatsapp.com/"
        ),
        image,
        category,
        country,
        description
      })
    })

    return groups
  }

  // ─── Endpoint ─────────────────────────────────────────────────────────────
  app.get("/search/wagroup", async (req, res) => {
    try {
      const { q, page = 0 } = req.query

      if (!q)
        return res.status(400).json({ status: false, message: "Falta ?q=" })

      const results = await searchGroups(q, Number(page))

      return res.json({
        status: true,
        query:  q,
        page:   Number(page),
        total:  results.length,
        results
      })

    } catch (err) {
      return res.status(500).json({ status: false, message: err.message })
    }
  })

}
