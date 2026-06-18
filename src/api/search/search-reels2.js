const axios = require('axios')
const cheerio = require('cheerio')
const { XMLParser } = require('fast-xml-parser')

const formatNumber = (num) => {
  if (!num && num !== 0) return undefined
  return Number(num).toLocaleString('en-US')
}

const toMB = (bytes) => {
  if (!bytes) return null
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

async function reelsSearch(query, num = 10) {
  const cx = 'e500c3a7a523b49df'
  const ins = axios.create({
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Android 16; SM-F966B Build) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      'x-client-data': 'CJDjygE='
    },
    timeout: 30000
  })

  const { data: init } = await ins.get('https://cse.google.com/cse.js', { params: { cx } })
  const cfg_ = init.match(/}\)\(({[\s\S]*?})\);/)
  if (!cfg_ || !cfg_[1]) throw new Error('No se pudo obtener la configuración')
  const cfg = JSON.parse(cfg_[1])

  const params = {
    rsz: 'filtered_cse', num, hl: 'es', source: 'gcsc',
    cselibv: cfg.cselibVersion, cx, q: query, safe: 'off',
    cse_tok: cfg.cse_token, lr: '', cr: '', gl: 'pe', filter: 0,
    sort: '', as_oq: '', as_sitesearch: '', exp: 'cc,apo', oq: '',
    callback: 'google.search.cse.api11171',
    rurl: Buffer.from('aHR0cHM6Ly9yZWVsc2ZpbmRlci5zYXRpc2h5YWRhdi5jb20v', 'base64').toString()
  }

  const { data: raw } = await ins.get('https://cse.google.com/cse/element/v1', { params })
  const jsonString = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
  const jsonData = JSON.parse(jsonString)

  return (jsonData.results || []).map((item) => ({
    title: item.richSnippet?.metatags?.ogTitle || '',
    description: item.richSnippet?.metatags?.ogDescription || '',
    url: item.url || '',
    image: item.richSnippet?.metatags?.ogImage || ''
  }))
}

async function igdlDownload(url) {
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'cache-control': 'max-age=0', 'dpr': '2', 'viewport-width': '980',
      'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile': '?1', 'sec-ch-ua-platform': '"Android"',
      'sec-ch-ua-platform-version': '"15.0.0"', 'sec-ch-ua-model': '"25028RN03A"',
      'sec-ch-ua-full-version-list': '"Chromium";v="136.0.7103.125", "Google Chrome";v="136.0.7103.125", "Not.A/Brand";v="99.0.0.0"',
      'sec-ch-prefers-color-scheme': 'light', 'dnt': '1',
      'upgrade-insecure-requests': '1', 'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'navigate', 'sec-fetch-user': '?1',
      'sec-fetch-dest': 'document', 'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'priority': 'u=0, i'
    },
    timeout: 10000
  })

  const $ = cheerio.load(html)
  let scriptJson = null

  $('script[type="application/json"]').each((_, el) => {
    const content = $(el).html()
    if (content && content.includes('xdt_api__v1__media__shortcode__web_info')) {
      try { scriptJson = JSON.parse(content) } catch {}
    }
  })

  if (!scriptJson) throw new Error('IG bloqueó o cambió estructura')

  const item =
    scriptJson.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox
      ?.result?.data?.xdt_api__v1__media__shortcode__web_info?.items?.[0]

  if (!item) throw new Error('Media no encontrada')

  const metadata = {}
  if (item.id) metadata.id = item.id
  if (item.code) metadata.code = item.code
  if (item.caption?.text) metadata.caption = item.caption.text
  if (item.taken_at) metadata.created_at = new Date(item.taken_at * 1000).toLocaleString()
  if (item.like_count) metadata.likes = formatNumber(item.like_count)
  if (item.comment_count) metadata.comments = formatNumber(item.comment_count)
  const views = item.play_count ?? item.video_view_count ?? item.view_count
  if (views) metadata.views = formatNumber(views)
  const shares = item.reshare_count ?? item.share_count
  if (shares) metadata.shares = formatNumber(shares)
  const duration = item.video_duration ??
    (item.clips_metadata?.original_sound_info?.duration_in_ms
      ? item.clips_metadata.original_sound_info.duration_in_ms / 1000 : null)
  if (duration) metadata.duration = duration

  const author = {}
  if (item.user?.pk) author.id = item.user.pk
  if (item.user?.username) author.username = item.user.username
  author.fullName = item.user?.full_name || item.user?.username || null
  if (item.user?.hd_profile_pic_url_info?.url) author.profilePic = item.user.hd_profile_pic_url_info.url
  if (item.user?.is_verified !== undefined) author.verified = item.user.is_verified

  let video = null
  let audio = null

  if (item.video_versions?.length) {
    const best = item.video_versions.sort((a, b) => b.width - a.width)[0]
    video = { url: best.url, resolution: `${best.width}x${best.height}`, hasAudio: true, size: toMB(best.filesize) }
  }

  if (!video && item.video_dash_manifest) {
    const parser = new XMLParser({ ignoreAttributes: false })
    const manifest = parser.parse(item.video_dash_manifest)
    const sets = manifest.MPD?.Period?.AdaptationSet || []
    const arr = Array.isArray(sets) ? sets : [sets]
    let videos = [], audios = []

    arr.forEach((set) => {
      const reps = Array.isArray(set.Representation) ? set.Representation : [set.Representation]
      reps.forEach((rep) => {
        if (!rep) return
        const base = { url: rep.BaseURL, bandwidth: parseInt(rep['@_bandwidth']) || 0 }
        if (set['@_contentType'] === 'video') {
          videos.push({ ...base, resolution: `${rep['@_width']}x${rep['@_height']}`, quality: rep['@_FBQualityLabel'] || '', size: base.bandwidth ? ((base.bandwidth / 8) / (1024 * 1024)).toFixed(2) + ' MB' : null })
        }
        if (set['@_contentType'] === 'audio') {
          audios.push({ ...base, size: base.bandwidth ? ((base.bandwidth / 8) / (1024 * 1024)).toFixed(2) + ' MB' : null })
        }
      })
    })

    video = videos.find((v) => v.quality.includes('720')) || videos.sort((a, b) => b.bandwidth - a.bandwidth)[0]
    if (video) video.hasAudio = false
    audio = audios.sort((a, b) => b.bandwidth - a.bandwidth)[0] || null
  }

  if (!video && item.image_versions2) {
    return {
      type: 'image', metadata, author,
      images: item.image_versions2.candidates.map((x) => ({ url: x.url, resolution: `${x.width}x${x.height}` }))
    }
  }

  return {
    type: 'video', metadata, author,
    media: {
      ...(video && { video }),
      ...(audio && { audio }),
      ...(item.image_versions2?.candidates && { thumbnails: item.image_versions2.candidates })
    }
  }
}

module.exports = function (app) {

  app.get('/search/reels/v2', async (req, res) => {
    try {
      const { q, num = 5 } = req.query
      if (!q) return res.status(400).json({ status: false, message: 'Falta el parámetro q' })

      const searchResults = await reelsSearch(q, Number(num))

      const downloads = await Promise.allSettled(
        searchResults.map((item) => igdlDownload(item.url))
      )

      const result = searchResults.map((searchItem, i) => {
        const dl = downloads[i]

        if (dl.status === 'rejected') {
          return {
            title: searchItem.title,
            description: searchItem.description,
            url: searchItem.url,
            thumbnail: searchItem.image,
            error: dl.reason?.message || 'Error al obtener datos del reel'
          }
        }

        const { type, metadata, author, media, images } = dl.value

        return {
          title: searchItem.title,
          description: searchItem.description,
          url: searchItem.url,
          thumbnail: searchItem.image,
          type,
          metadata,
          author,
          ...(type === 'video' && media ? { media } : {}),
          ...(type === 'image' && images ? { images } : {})
        }
      })

      return res.json({ status: true, total: result.length, result })
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message })
    }
  })

}
