const axios = require('axios')
const cheerio = require('cheerio')

const BASE = 'https://tioanime.com'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/147.0.0.0 Mobile Safari/537.36',
  'Referer': `${BASE}/`,
  'Origin': BASE,
}

// ─── Helpers ─────────────────────────────────────────────────
function fixUrl(url) {
  if (!url) return ''
  if (url.startsWith('//')) return 'https:' + url
  if (url.startsWith('/')) return BASE + url
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

// ─── Search ──────────────────────────────────────────────────
async function searchAnime(query) {
  const $ = await post(`${BASE}/directorio`, { q: query })
  const result = []

  $('article').each((_, el) => {
    const a = $(el).find('a').first()
    const link = fixUrl(a.attr('href') || '')
    const image = fixUrl($(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '')
    const title = $(el).find('h3').text().trim() || a.attr('title') || ''
    const type = $(el).find('.badge').text().trim() || ''

    if (title && link) result.push({ title, type, link, image })
  })

  return result
}

// ─── Detail ──────────────────────────────────────────────────
async function getDetail(url) {
  const $ = await get(url)

  const title = $('h1.anime-title, h1').first().text().trim()
  const image = fixUrl($('.cover img, .anime-cover img, .thumb img').attr('src') || '')
  const synopsis = $('.synopsis p, .description p, p.sinopsis').first().text().trim()
  const type = $('.badge, .type').first().text().trim()
  const status = $('.status, .estado').first().text().trim()
  const genres = []
  const episodes = []
  const info = {}

  // Géneros
  $('.genres a, .genre a, .tags a').each((_, el) => {
    const g = $(el).text().trim()
    if (g) genres.push(g)
  })

  // Info extra (año, estudio, etc)
  $('.anime-info li, .info-list li, .metadata li').each((_, el) => {
    const text = $(el).text().trim()
    const [key, ...val] = text.split(':')
    if (key && val.length) info[key.trim().toLowerCase()] = val.join(':').trim()
  })

  // Episodios desde script
  const scriptContent = $('script').map((_, el) => $(el).html()).get().join('\n')
  const epsMatch = scriptContent.match(/var\s+episodes\s*=\s*(\[[\s\S]*?\]);/)
  const slugMatch = scriptContent.match(/var\s+anime_info\s*=\s*(\[[\s\S]*?\]);/)

  let slug = ''
  if (slugMatch) {
    try {
      const info_arr = JSON.parse(slugMatch[1])
      slug = info_arr[2] || ''
    } catch {}
  }

  if (epsMatch) {
    try {
      const eps = JSON.parse(epsMatch[1])
      for (const ep of eps) {
        const epNum = Array.isArray(ep) ? ep[0] : ep
        episodes.push({
          episode: epNum,
          title: `Episodio ${epNum}`,
          link: `${BASE}/ver/${slug}-${epNum}`,
        })
      }
    } catch {}
  }

  // Fallback por HTML si no hay script
  if (!episodes.length) {
    $('ul.episodes-list li a, .episode-list li a, .ListCaps li a').each((_, el) => {
      const epLink = fixUrl($(el).attr('href') || '')
      const epTitle = $(el).text().trim()
      const epNum = epTitle.match(/\d+/)?.[0]
      if (epLink) episodes.push({
        episode: epNum ? parseInt(epNum) : null,
        title: epTitle,
        link: epLink,
      })
    })
  }

  return {
    title,
    image,
    synopsis,
    type,
    status,
    genres,
    info,
    totalEpisodes: episodes.length,
    episodes: episodes.reverse(),
  }
}

// ─── Episode ─────────────────────────────────────────────────
async function getEpisode(url) {
  const $ = await get(url)

  const title = $('h1, .episode-title').first().text().trim()
  const servers = []
  const downloads = []

  // Servidores desde script
  const scriptContent = $('script').map((_, el) => $(el).html()).get().join('\n')

  const serversMatch = scriptContent.match(/var\s+videos\s*=\s*(\[[\s\S]*?\]);/)
  if (serversMatch) {
    try {
      const vids = JSON.parse(serversMatch[1])
      for (const v of vids) {
        if (Array.isArray(v) && v[1]) {
          servers.push({
            server: v[0] || 'server',
            url: v[1],
            type: v[2] || 'embed',
          })
        }
      }
    } catch {}
  }

  // Fallback iframes
  if (!servers.length) {
    $('iframe').each((_, el) => {
      const src = fixUrl($(el).attr('src') || $(el).attr('data-src') || '')
      if (src) servers.push({ server: 'iframe', url: src, type: 'embed' })
    })
  }

  // Links de descarga directa
  $('a.btn-download, .download-links a, a[href*=".mp4"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const label = $(el).text().trim()
    if (href) downloads.push({ label: label || 'download', url: fixUrl(href) })
  })

  // MP4/M3U8 desde scripts
  const urlMatches = [...scriptContent.matchAll(/https?:\/\/[^\s"'\\]+\.(?:mp4|m3u8)[^\s"'\\]*/g)]
  for (const m of urlMatches) {
    const u = m[0]
    if (!downloads.find(d => d.url === u)) downloads.push({ label: 'direct', url: u })
  }

  return { title, url, servers, downloads }
}

// ─── Últimos episodios ────────────────────────────────────────
async function getLatest(page = 1) {
  const $ = await get(`${BASE}/emision?p=${page}`)
  const result = []

  $('article').each((_, el) => {
    const a = $(el).find('a').first()
    const link = fixUrl(a.attr('href') || '')
    const image = fixUrl($(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '')
    const title = $(el).find('h3').text().trim() || a.attr('title') || ''
    const episode = $(el).find('.badge, .episode-num, .Capi').text().trim() || ''

    if (title && link) result.push({ title, episode, link, image })
  })

  return result
}

// ─── Directorio ──────────────────────────────────────────────
async function getDirectory(page = 1, genre = '') {
  const url = genre
    ? `${BASE}/directorio?genero=${encodeURIComponent(genre)}&p=${page}`
    : `${BASE}/directorio?p=${page}`
  const $ = await get(url)
  const result = []

  $('article').each((_, el) => {
    const a = $(el).find('a').first()
    const link = fixUrl(a.attr('href') || '')
    const image = fixUrl($(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '')
    const title = $(el).find('h3').text().trim() || a.attr('title') || ''
    const type = $(el).find('.badge').text().trim() || ''

    if (title && link) result.push({ title, type, link, image })
  })

  return result
}

// ─── Endpoints ───────────────────────────────────────────────
module.exports = function (app) {

  // 🔍 SEARCH
  // GET /anime/search/tioanime?q=naruto
  app.get('/anime/search/tioanime', async (req, res) => {
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
  // GET /anime/detail/tioanime?url=https://tioanime.com/anime/naruto
  app.get('/anime/detail/tioanime1', async (req, res) => {
    try {
      const { url } = req.query
      if (!url) return res.status(400).json({ status: false, message: 'Falta ?url=' })

      const result = await getDetail(url)
      return res.json({ status: true, result })
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message })
    }
  })

  // 🎬 EPISODE
  // GET /anime/episode/tioanime?url=https://tioanime.com/ver/naruto-1
  app.get('/anime/episode/tioanime', async (req, res) => {
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
  // GET /anime/latest/tioanime?page=1
  app.get('/anime/latest/tioanime', async (req, res) => {
    try {
      const { page = '1' } = req.query
      const result = await getLatest(parseInt(page))
      return res.json({ status: true, page: parseInt(page), total: result.length, result })
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message })
    }
  })

  // 📋 DIRECTORIO
  // GET /anime/directory/tioanime?page=1&genre=accion
  app.get('/anime/directory/tioanime', async (req, res) => {
    try {
      const { page = '1', genre = '' } = req.query
      const result = await getDirectory(parseInt(page), genre)
      return res.json({ status: true, page: parseInt(page), total: result.length, result })
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message })
    }
  })

}