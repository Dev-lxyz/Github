module.exports = function (app) {
  const axios = require('axios')

  const client = axios.create({
    timeout: 45000,
    maxRedirects: 10,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Upgrade-Insecure-Requests': '1',
    }
  })

  const RE_URL = /(?:https?:\/\/)?(?:www\.|m\.|web\.|l\.)?facebook\.com\/[^\s<>"']+|fb\.watch\/[^\s<>"']+/i
  const RE_ID  = /\/reel\/(\d+)|[?&]v=(\d+)|\/videos\/(\d+)/
  const RE_SHORT = /\/share\/(?:v|r|p)\/|fb\.watch\//

  const HDR = {
    accept: 'text/html,application/xhtml+xml',
    'accept-language': 'es-ES,es;q=0.9'
  }

  const fb = async (url, { headers = {}, timeout = 45000, binary = false } = {}) => {
    const res = await client.get(url, {
      headers: { ...HDR, ...headers },
      timeout,
      responseType: binary ? 'arraybuffer' : 'text',
      // Captura la URL final tras redirects
      validateStatus: () => true,
    })

    return {
      status: res.status,
      url:    res.request?.res?.responseUrl || res.config?.url || url,
      body:   binary ? Buffer.from(res.data) : res.data,
      headers: res.headers
    }
  }

  const reelPage = id => `https://www.facebook.com/reel/${id}`

  const reelId = u =>
    (u.match(RE_ID) || []).slice(1).find(Boolean)

  const unesc = s =>
    s
      .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\\//g, '/')

  const parseNum = v => {
    if (v == null || v === '') return null
    const n = parseFloat(String(v).replace(/[^\d.,KMB]/gi, '').replace(',', '.'))
    if (Number.isNaN(n)) return null
    const u = String(v).toUpperCase()
    if (/K|MIL/.test(u)) return Math.round(n * 1e3)
    if (/M/.test(u))      return Math.round(n * 1e6)
    return Math.round(n)
  }

  const fromTitle = (t, k) =>
    parseNum(t?.match(new RegExp(`([\\d.,]+)\\s*(mil|k|m)?\\s*${k}`, 'i'))?.[0])

  const beforePost = (h, pid, re) =>
    h.match(new RegExp(`${re.source}[\\s\\S]{0,8000}?"post_id":"${pid}"`))?.[1]

  function parseStats(h, id) {
    const ogT = h.match(/property="og:title" content="([^"]+)"/i)?.[1]
    const ogD = h.match(/property="og:description" content="([^"]+)"/i)?.[1]
    const pid =
      h.match(new RegExp(`"video":\\{"id":"${id}"[\\s\\S]{0,12000}?"post_id":"(\\d+)"`))?.[1] ||
      h.match(/"post_id":"(\d+)"/)?.[1]

    const last = ogT?.split('|').pop()?.trim()

    const s = {
      reelId: id,
      url: reelPage(id),
      description:
        ogD || (last && !/views|reproducciones|reactions|reacciones/i.test(last) ? last : null),
      views:
        +(h.match(/"(?:play|video_view|view)_count":(\d+)/)?.[1] || '') ||
        fromTitle(ogT, 'reproducciones|views?'),
      reactions: pid ? +(beforePost(h, pid, /"unified_reactors":\{"count":(\d+)/) || '') : null,
      comments:  pid ? +(beforePost(h, pid, /"total_comment_count":(\d+)/) || '')   : null,
      shares:    pid ? parseNum(beforePost(h, pid, /"share_count_reduced":"([^"]+)"/)) : null,
    }

    if (!s.reactions) s.reactions = fromTitle(ogT, 'reacciones|reactions?')
    if (!s.views)     s.views     = fromTitle(ogT, 'reproducciones|views?')

    return s
  }

  function parseVideo(h, id) {
    const c = h.includes(`"id":"${id}"`)
      ? h.slice(h.indexOf(`"id":"${id}"`), h.indexOf(`"id":"${id}"`) + 25000)
      : h
    const m = re => (c.match(re) || h.match(re))?.[1]
    return unesc(
      m(/"browser_native_hd_url":"((?:\\.|[^"\\])+)"/) ||
      m(/"browser_native_sd_url":"((?:\\.|[^"\\])+)"/) ||
      ''
    )
  }

  async function getReel(text) {
    const raw  = String(text || '').trim()
    const link = (raw.match(RE_URL)?.[0] || raw.split(/\s+/)[0])?.replace(/[.,;:!?)]+$/g, '')
    if (!link) return null

    const source = link.startsWith('http') ? link : `https://${link}`
    let id   = reelId(source)
    let html

    if (!id && RE_SHORT.test(source)) {
      const r = await fb(source)
      id   = reelId(r.url) || r.body.match(/\/reel\/(\d+)/)?.[1]
      html = r.body
      if (!id) return null
    }

    if (!id) return null

    const url = reelPage(id)

    if (!html) {
      const r = await fb(url)
      if (r.status !== 200) throw new Error(`HTTP ${r.status}`)
      html = r.body
    }

    const stats     = parseStats(html, id)
    stats.sourceUrl = source
    stats.videoUrl  = parseVideo(html, id)
    return stats
  }

  app.get('/download/facebook/v4', async (req, res) => {
    try {
      const { url } = req.query
      if (!url) {
        return res.json({ status: false, error: 'Falta parametro ?url=' })
      }

      const target = await getReel(url)
      if (!target) {
        return res.json({ status: false, error: 'No se pudo obtener el reel' })
      }

      let sizeMB     = null
      let uploadDate = null

      if (target.videoUrl) {
        try {
          const head = await fb(target.videoUrl, {
            headers: {
              referer: target.url,
              origin:  'https://www.facebook.com'
            }
          })
          const len = head.headers['content-length']
          if (len) sizeMB = (Number(len) / 1024 / 1024).toFixed(2)
          uploadDate = head.headers['last-modified'] || null
        } catch {}
      }

      return res.json({
        status: true,
        result: {
          description: target.description,
          reelId:      target.reelId,
          source:      target.sourceUrl,
          facebook:    target.url,
          views:       target.views,
          reactions:   target.reactions,
          comments:    target.comments,
          shares:      target.shares,
          date:        uploadDate,
          size:        sizeMB ? `${sizeMB} MB` : null,
          download:    { url: target.videoUrl }
        }
      })

    } catch (e) {
      return res.json({ status: false, error: e.message })
    }
  })
}