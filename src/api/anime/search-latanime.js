const axios = require('axios')
const cheerio = require('cheerio')

const BASE = 'https://latanime.org'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/147.0.0.0 Mobile Safari/537.36',
  'Referer': `${BASE}/`,
  'Origin': BASE,
}

// ─── Helpers ─────────────────────────────────────────────────
function fixUrl(url, base = BASE) {
  if (!url) return ''
  if (url.startsWith('//')) return 'https:' + url
  if (url.startsWith('/')) return base + url
  return url
}

async function get(url) {
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 30000 })
  return cheerio.load(data)
}

async function post(url, body) {
  const { data } = await axios.post(url, new URLSearchParams(body), {
    headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000,
  })
  return cheerio.load(data)
}

// ─── Scraper functions ────────────────────────────────────────
async function searchAnime(query) {
  const $ = await post(BASE + '/', { s: query })
  const result = []

  $('article').each((_, el) => {
    const a = $(el).find('a').first()
    const link = fixUrl(a.attr('href') || '')
    const image = fixUrl($(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '')
    const title = $(el).find('h3').text().trim() || a.attr('title') || ''
    const type = $(el).find('.type').text().trim() || ''
    const status = $(el).find('.status').text().trim() || ''

    if (title && link) result.push({ title, type, status, link, image })
  })

  return result
}

async function getDetail(url) {
  const $ = await get(url)

  const title = $('h1.Title, h1').first().text().trim()
  const image = fixUrl($('.Image img, .anime-image img').attr('src') || '')
  const synopsis = $('.Description p, .sinopsis p, .synopsis').first().text().trim()
  const status = $('.AnimeStatus, .status').first().text().trim()
  const genres = []
  const episodes = []

  $('.Nvg a, .genres a, .genre-list a').each((_, el) => {
    const g = $(el).text().trim()
    if (g) genres.push(g)
  })

  // Info extra
  const info = {}
  $('.AnimeInfo li, .anime-info li, .info li').each((_, el) => {
    const text = $(el).text().trim()
    const [key, ...val] = text.split(':')
    if (key && val.length) info[key.trim().toLowerCase()] = val.join(':').trim()
  })

  // Episodios
  $('ul.ListCaps li, .episodes-list li, #episodes-list li').each((_, el) => {
    const a = $(el).find('a').first()
    const epTitle = a.text().trim()
    const epLink = fixUrl(a.attr('href') || '')
    const epNum = epTitle.match(/\d+/)?.[0] || ''
    const epImage = fixUrl($(el).find('img').attr('src') || '')

    if (epLink) episodes.push({
      episode: epNum ? parseInt(epNum) : null,
      title: epTitle,
      link: epLink,
      image: epImage || null,
    })
  })

  return {
    title,
    image,
    synopsis,
    status,
    genres,
    info,
    totalEpisodes: episodes.length,
    episodes: episodes.reverse(), // orden ascendente
  }
}

async function getEpisode(url) {
  const $ = await get(url)

  const title = $('h1, .episode-title').first().text().trim()
  const servers = []

  // Buscar iframes y opciones de servidor
  $('iframe').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || ''
    if (src) servers.push({ server: 'iframe', url: fixUrl(src) })
  })

  $('.CapitolosOpciones a, .servers a, .server-item, .opciones a').each((_, el) => {
    const label = $(el).text().trim()
    const href = fixUrl($(el).attr('href') || $(el).attr('data-url') || '')
    if (href) servers.push({ server: label || 'server', url: href })
  })

  // Scripts con URLs de video
  const downloads = []
  $('script').each((_, el) => {
    const content = $(el).html() || ''
    const matches = [...content.matchAll(/https?:\/\/[^\s"']+\.(?:mp4|m3u8)[^\s"']*/g)]
    for (const m of matches) {
      const u = m[0].replace(/\\/g, '')
      if (!downloads.includes(u)) downloads.push(u)
    }
  })

  return { title, url, servers, downloads }
}

async function getLatest(page = 1) {
  const $ = await get(`${BASE}/emision?page=${page}`)
  const result = []

  $('article').each((_, el) => {
    const a = $(el).find('a').first()
    const link = fixUrl(a.attr('href') || '')
    const image = fixUrl($(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '')
    const title = $(el).find('h3').text().trim() || a.attr('title') || ''
    const episode = $(el).find('.Capi, .episode-num').text().trim() || ''

    if (title && link) result.push({ title, episode, link, image })
  })

  return result
}

// ─── Endpoints ───────────────────────────────────────────────
module.exports = function (app) {

  // 🔍 SEARCH
  // GET /anime/search/latanime?q=naruto
  app.get('/anime/search/latanime', async (req, res) => {
    try {
      const { q } = req.query
      if (!q) return res.status(400).json({ status: false, message: 'Falta ?q=' })

      const result = await searchAnime(q)
      return res.json({ status: true, total: result.length, result })
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message })
    }
  })

  // 📖 DETAIL
  // GET /anime/detail/latanime?url=https://latanime.org/anime/naruto
  app.get('/anime/detail/latanime', async (req, res) => {
    try {
      const { url } = req.query
      if (!url) return res.status(400).json({ status: false, message: 'Falta ?url=' })

      const result = await getDetail(url)
      return res.json({ status: true, result })
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message })
    }
  })

  // 🎬 EPISODE (servidores + links de descarga)
  // GET /anime/episode/latanime?url=https://latanime.org/ver/naruto-episodio-1
  app.get('/anime/episode/latanime', async (req, res) => {
    try {
      const { url } = req.query
      if (!url) return res.status(400).json({ status: false, message: 'Falta ?url=' })

      const result = await getEpisode(url)
      return res.json({ status: true, result })
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message })
    }
  })

  // 🆕 ÚLTIMOS EPISODIOS
  // GET /anime/latest/latanime?page=1
  app.get('/anime/latest/latanime', async (req, res) => {
    try {
      const { page = '1' } = req.query
      const result = await getLatest(parseInt(page))
      return res.json({ status: true, page: parseInt(page), total: result.length, result })
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message })
    }
  })

}