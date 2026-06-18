const axios = require('axios')

const BASE = 'https://manga18.me'
const UA = 'Mozilla/5.0 (Linux; Android 10; M2006C3MG Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/148.0.7778.178 Mobile Safari/537.36'

// ─── Helper fetch ────────────────────────────────────────────
async function fetchHTML(url) {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': UA },
    timeout: 15000,
  })
  return data
}

// ─── Extraer lista de manga ──────────────────────────────────
function extractManga(html, page = 1, limit = 20) {
  const manga = []
  const seen = new Set()

  const allImgs = [
    ...html.matchAll(/<img[^>]*src="(https?:\/\/manga18\.me\/webtoon\/[^"]+-thumbnail\.jpg)"/gi),
  ].map((m) => m[1])

  const linkRegex = /<a[^>]*href="(\/manga\/([^"]+))"/gi
  let match
  const links = []

  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1], slug = match[2]
    if (url.includes('/chapter-')) continue
    if (seen.has(url)) continue
    seen.add(url)

    const context = html.substring(Math.max(0, match.index - 500), match.index + 500)
    const titleMatch = context.match(/<h[23][^>]*>([^<]+)<\/h[23]>/)
    const altMatch = context.match(/alt="([^"]+)"/)
    const title = titleMatch
      ? titleMatch[1]
      : altMatch
      ? altMatch[1]
      : slug.replace(/-/g, ' ')

    links.push({
      url: BASE + url,
      title: title.trim().replace(/&#8217;|&amp;/g, "'").replace(/&#038;/g, '&'),
      slug,
    })
  }

  links.forEach((link, i) => {
    manga.push({
      title: link.title,
      url: link.url,
      slug: link.slug,
      thumbnail: allImgs[i] || null,
    })
  })

  const pageLinks = [...html.matchAll(/page[=/_](\d+)/gi)].map((m) => parseInt(m[1]))
  return {
    manga: manga.slice(0, limit),
    current_page: page,
    total_pages: pageLinks.length ? Math.max(...pageLinks) : 1,
    total: manga.slice(0, limit).length,
  }
}

// ─── Detail ──────────────────────────────────────────────────
async function getDetail(slug) {
  const html = await fetchHTML(`${BASE}/manga/${slug}`)

  const detail = {
    slug,
    url: `${BASE}/manga/${slug}`,
    title: '',
    description: '',
    thumbnail: '',
    genres: [],
    chapters: [],
  }

  const titleMatch = html.match(/<title>([^<]+)<\/title>/)
  detail.title = titleMatch
    ? titleMatch[1].split(' - ')[0].replace(/Read /, '').replace(/ Manhwa at Manga18\.ME/, '').trim()
    : slug

  const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i)
  detail.description = descMatch ? descMatch[1] : ''

  const imgMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i)
  detail.thumbnail = imgMatch ? imgMatch[1] : ''

  const genreRegex = /<a[^>]*href="\/genre\/[^"]*"[^>]*>([^<]+)<\/a>/gi
  let m
  while ((m = genreRegex.exec(html)) !== null) detail.genres.push(m[1].trim())

  const chapterRegex = new RegExp(
    `<a[^>]*href="(/manga/${slug}/chapter-\\d+)"[^>]*>([^<]+)<\\/a>`,
    'gi'
  )
  while ((m = chapterRegex.exec(html)) !== null)
    detail.chapters.push({ name: m[2].trim(), url: BASE + m[1] })

  detail.total_chapters = detail.chapters.length
  return detail
}

// ─── Chapter ─────────────────────────────────────────────────
async function getChapter(slug, chapter = 'chapter-1') {
  const html = await fetchHTML(`${BASE}/manga/${slug}/${chapter}`)
  let images = []

  const scriptMatch = html.match(/var\s+chapter_images\s*=\s*(\[[^\]]+\])/)
  if (scriptMatch) try { images = JSON.parse(scriptMatch[1]) } catch {}

  if (!images.length) {
    const dataRegex = /data-src="(https?:\/\/img-r\d?\.manga18\.me\/[^"]+\.(?:jpg|png|webp))"/gi
    let m
    while ((m = dataRegex.exec(html)) !== null) images.push(m[1])
  }

  if (!images.length) {
    const srcRegex = /<img[^>]*src="(https?:\/\/img-r\d?\.manga18\.me\/[^"]+\.(?:jpg|png|webp))"/gi
    let m
    while ((m = srcRegex.exec(html)) !== null) images.push(m[1])
  }

  if (!images.length) {
    images = [
      ...new Set(
        [...html.matchAll(/https?:\/\/img-r\d?\.manga18\.me\/[^"'\s]+\.(?:jpg|png|webp)/gi)].map(
          (m) => m[0]
        )
      ),
    ]
  }

  return {
    slug,
    chapter,
    url: `${BASE}/manga/${slug}/${chapter}`,
    total_pages: images.length,
    images: [...new Set(images)],
  }
}

// ─── Endpoints ───────────────────────────────────────────────
module.exports = function (app) {

  app.get('/search/nsfw/manga18', async (req, res) => {
    try {
      const { q, page = 1, limit = 20 } = req.query
      if (!q) return res.status(400).json({ status: false, message: 'Falta ?q=' })

      const html = await fetchHTML(
        `${BASE}/search?q=${encodeURIComponent(q)}&page=${page}`
      )
      const result = extractManga(html, parseInt(page), parseInt(limit))

      return res.json({
        status: true,
        mode: 'search',
        query: q,
        ...result,
      })
    } catch (err) {
      return res.status(500).json({ status: false, message: err.message })
    }
  })

  // 📖 DETAIL  →  /manga18/detail?slug=me-a-guy-lesbian
  app.get('/nsfw/detail/manga18', async (req, res) => {
    try {
      const { slug } = req.query
      if (!slug) return res.status(400).json({ status: false, message: 'Falta ?slug=' })

      const result = await getDetail(slug)
      return res.json({ status: true, mode: 'detail', ...result })
    } catch (err) {
      return res.status(500).json({ status: false, message: err.message })
    }
  })

  // 📄 CHAPTER  →  /manga18/chapter?slug=me-a-guy-lesbian&chapter=chapter-1
  app.get('/nsfw/chapter/manga18', async (req, res) => {
    try {
      const { slug, chapter = 'chapter-1' } = req.query
      if (!slug) return res.status(400).json({ status: false, message: 'Falta ?slug=' })

      const result = await getChapter(slug, chapter)
      return res.json({ status: true, mode: 'chapter', ...result })
    } catch (err) {
      return res.status(500).json({ status: false, message: err.message })
    }
  })

  // 🏠 HOME  →  /manga18/home?page=1
  app.get('/nsfw/home/manga18', async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query
      const html = await fetchHTML(`${BASE}/?page=${page}`)
      const result = extractManga(html, parseInt(page), parseInt(limit))
      return res.json({ status: true, mode: 'home', ...result })
    } catch (err) {
      return res.status(500).json({ status: false, message: err.message })
    }
  })

  // ✅ COMPLETED  →  /manga18/completed?page=1
  app.get('/nsfw/completed/manga18', async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query
      const html = await fetchHTML(`${BASE}/completed?page=${page}`)
      const result = extractManga(html, parseInt(page), parseInt(limit))
      return res.json({ status: true, mode: 'completed', ...result })
    } catch (err) {
      return res.status(500).json({ status: false, message: err.message })
    }
  })

}