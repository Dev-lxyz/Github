const axios = require('axios')
const { wrapper } = require('axios-cookiejar-support')
const { CookieJar } = require('tough-cookie')

module.exports = function (app) {

  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  const base = 'https://www.facebook.com'
  const graphql_url = `${base}/api/graphql/`
  const search_doc_id = '27004494905847061'

  // ─── Cookies de sesión ───────────────────────────────────────
  const SESSION_COOKIES = [
    { name: 'datr', value: '3H0KagKVy04s29ssF98-WSmO' },
    { name: 'sb', value: '3H0KajCaDC3fIQ7DCs7TmE8k' },
    { name: 'c_user', value: '61589734632097' },
    { name: 'xs', value: '48%3ArnyxX0VX-Zfo6w%3A2%3A1779072562%3A-1%3A-1%3A%3AAcwvd6NMHQS0Y3aIbYnB81X24lTq698wJ7MkORPYHA' },
    { name: 'fr', value: '1EJ4nDpNhzRoDMyyi.AWdKEdDm8izeYubi1NZIxfRag1Yvc5Y1KHejjLiDoDtVAjbh50k.BqCn5M..AAA.0.0.BqCn5P.AWexcoYrrh2Zz15vIPTfrweQw2c' },
    { name: 'presence', value: 'C%7B%22t3%22%3A%5B%5D%2C%22utc3%22%3A1779072597776%2C%22v%22%3A1%7D' },
    { name: 'wd', value: '1366x633' },
  ]

  // ─── Crear cliente axios con cookie jar ──────────────────────
  function createClient() {
    const jar = new CookieJar()
    const client = wrapper(axios.create({ jar, withCredentials: true, timeout: 30000 }))

    // Inyectar cookies de sesión en el jar
    for (const c of SESSION_COOKIES) {
      jar.setCookieSync(`${c.name}=${c.value}; Domain=.facebook.com; Path=/`, base)
    }

    return { client, jar }
  }

  function getCookieString() {
    return SESSION_COOKIES.map(c => `${c.name}=${c.value}`).join('; ')
  }

  // ─── Obtener tokens de sesión ────────────────────────────────
  async function getSessionTokens(client) {
    const { data: html } = await client.get(base, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-LA,es;q=0.9',
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'Cookie': getCookieString(),
      },
    })

    const extract = (p) => { const m = html.match(p); return m ? m[1] : '' }

    const fb_dtsg = extract(/\["DTSGInitData",\[\],\{"token":"([^"]+)"/) || extract(/"dtsg":\{"token":"([^"]+)"/)
    const lsd = extract(/\["LSD",\[\],\{"token":"([^"]+)"/) || extract(/name="lsd"\s+value="([^"]+)"/)
    const hsi = extract(/"hsi":"(\d+)"/) || Date.now().toString()
    const rev = extract(/"server_revision":(\d+)/) || extract(/"__spin_r":(\d+)/) || '1039686045'
    const jazoest = extract(/jazoest=(\d+)/) || '25227'
    const hs = extract(/"haste_session":"([^"]+)"/) || '20591.HYP:comet_pkg.2.1...0'
    const userId = extract(/"USER_ID":"(\d+)"/)

    if (!fb_dtsg || !userId || userId === '0')
      throw new Error('Cookies inválidas o expiradas — actualiza las cookies de sesión')

    return { fb_dtsg, lsd, hsi, rev, jazoest, hs, userId }
  }

  // ─── Variables de búsqueda ───────────────────────────────────
  function buildSearchVariables(query, limit) {
    return {
      allow_streaming: false,
      args: {
        callsite: 'COMET_GLOBAL_SEARCH',
        config: { exact_match: false, high_confidence_config: null, intercept_config: null, sts_disambiguation: null, watch_config: null },
        context: { bsid: '8095a9e1-65db-41f1-8432-6174ee177dbf', tsid: '0.6759594228535778' },
        experience: { client_defined_experiences: ['ADS_PARALLEL_FETCH'], encoded_server_defined_params: null, fbid: null, type: 'GLOBAL_SEARCH' },
        filters: [],
        text: query,
      },
      count: limit,
      cursor: null,
      feedLocation: 'SEARCH',
      feedbackSource: 23,
      fetch_filters: true,
      focusCommentID: null,
      locale: null,
      privacySelectorRenderLocation: 'COMET_STREAM',
      renderLocation: 'search_results_page',
      scale: 1,
      stream_initial_count: 0,
      useDefaultActor: false,
      '__relay_internal__pv__GHLShouldChangeAdIdFieldNamerelayprovider': true,
      '__relay_internal__pv__GHLShouldChangeSponsoredDataFieldNamerelayprovider': true,
      '__relay_internal__pv__CometFeedStory_enable_reactor_facepilerelayprovider': false,
      '__relay_internal__pv__FBReels_deprecate_short_form_video_context_gkrelayprovider': true,
      '__relay_internal__pv__FBReels_enable_view_dubbed_audio_type_gkrelayprovider': true,
      '__relay_internal__pv__CometUFIShareActionMigrationrelayprovider': true,
      '__relay_internal__pv__CometUFISingleLineUFIrelayprovider': true,
    }
  }

  // ─── Construir body ──────────────────────────────────────────
  function buildBody(tokens, variables) {
    const p = new URLSearchParams()
    p.set('av', tokens.userId)
    p.set('__user', tokens.userId)
    p.set('__a', '1')
    p.set('__req', 'a')
    p.set('__hs', tokens.hs)
    p.set('dpr', '1')
    p.set('__ccg', 'GOOD')
    p.set('__rev', tokens.rev)
    p.set('__hsi', tokens.hsi)
    p.set('__comet_req', '15')
    p.set('fb_dtsg', tokens.fb_dtsg)
    p.set('jazoest', tokens.jazoest)
    p.set('lsd', tokens.lsd)
    p.set('fb_api_caller_class', 'RelayModern')
    p.set('fb_api_req_friendly_name', 'SearchCometResultsPaginatedResultsQuery')
    p.set('variables', JSON.stringify(variables))
    p.set('server_timestamps', 'true')
    p.set('doc_id', search_doc_id)
    return p.toString()
  }

  // ─── Parsear respuesta ───────────────────────────────────────
  function parseEdges(text) {
    const usersMap = new Map()
    const videos = []
    const photos = []

    for (const line of text.split('\n')) {
      try {
        const j = JSON.parse(line)
        const edges = j?.data?.serpResponse?.results?.edges || []

        for (const edge of edges) {
          const node = edge.node || {}

          if (node.__typename === 'User' || node.__typename === 'Page') {
            if (!usersMap.has(node.id)) {
              usersMap.set(node.id, {
                id: node.id,
                name: node.name || '',
                url: node.url || `${base}/${node.id}`,
                verified: node.is_verified || false,
                avatar: node.profile_picture?.uri || '',
              })
            }
          }

          const story = edge.rendering_strategy?.view_model?.click_model?.story
          if (!story) continue

          const owner = story.feedback?.owning_profile || {}
          const s = JSON.stringify(edge)

          if (owner.id && !usersMap.has(owner.id)) {
            usersMap.set(owner.id, {
              id: owner.id,
              name: owner.name || '',
              url: (s.match(/"profile_url":\s*"([^"]+)"/) || [])[1] || `${base}/${owner.id}`,
              verified: false,
              avatar: (s.match(/"profile_picture":\{"uri":"([^"]+)"/) || [])[1] || '',
            })
          }

          const statsObj = {
            likes: parseInt((s.match(/"reaction_count":\s*\{"count":\s*(\d+)/) || [])[1] || '0'),
            comments: parseInt((s.match(/"total_comment_count":\s*(\d+)/) || [])[1] || '0'),
            shares: parseInt((s.match(/"share_count":\s*\{"count":\s*(\d+)/) || [])[1] || '0'),
            views: parseInt((s.match(/"video_view_count":\s*(\d+)/) || [])[1] || '0'),
          }

          const postText = ((s.match(/"message":\s*\{"text":\s*"([^"]+)"/) || [])[1] || '')
            .replace(/\\n/g, '\n')
            .replace(/\\u[\dA-F]{4}/gi, m => String.fromCharCode(parseInt(m.replace(/\\u/g, ''), 16)))

          const sd_url = (s.match(/"progressive_url":"([^"]+)","failure_reason":null,"metadata":\{"quality":"SD"\}/) || [])[1] || ''
          const hd_url = (s.match(/"progressive_url":"([^"]+)","failure_reason":null,"metadata":\{"quality":"HD"\}/) || [])[1] || ''
          const fallback_url = (s.match(/"playable_url":"([^"]+)"/) || [])[1] || ''
          const fallback_hd = (s.match(/"playable_url_quality_hd":"([^"]+)"/) || [])[1] || ''
          const duration_ms = parseInt((s.match(/"playable_duration_in_ms":(\d+)/) || [])[1] || '0')
          const duration_sec = duration_ms > 0 ? Math.floor(duration_ms / 1000) : parseInt((s.match(/"length_in_second":([\d.]+)/) || [])[1] || '0')
          const thumb = (s.match(/"first_frame_thumbnail":"([^"]+)"/) || s.match(/"preferred_thumbnail":\{"image":\{"uri":"([^"]+)"/) || [])[1] || ''
          const photo_url = (s.match(/"image":\{"uri":"([^"]+)"/) || [])[1] || ''
          const w = parseInt((s.match(/"original_width":(\d+)/) || [])[1] || '0')
          const h = parseInt((s.match(/"original_height":(\d+)/) || [])[1] || '0')

          let foundMedia = false

          for (const att of story.attachments || []) {
            const media = att.media || att.styles?.attachment?.media
            if (!media) continue

            if (media.__typename === 'Video' || s.includes('"__isMedia":"Video"')) {
              foundMedia = true
              videos.push({
                id: story.id || media.id || '',
                author_id: owner.id || '',
                text: postText,
                media_type: 'Video',
                thumbnail: (thumb || '').replace(/\\/g, ''),
                url: ((s.match(/"url":\s*"(https:\/\/www\.facebook\.com\/[^"]+)"/) || [])[1] || '').replace(/\\/g, ''),
                download_sd: (sd_url || fallback_url || '').replace(/\\/g, ''),
                download_hd: (hd_url || fallback_hd || '').replace(/\\/g, ''),
                duration: duration_sec,
                width: w,
                height: h,
                stats: statsObj,
              })
            } else if (media.__typename === 'Photo' || s.includes('"__isMedia":"Photo"')) {
              foundMedia = true
              photos.push({
                id: story.id || media.id || '',
                author_id: owner.id || '',
                text: postText,
                media_type: 'Photo',
                url: ((s.match(/"url":\s*"(https:\/\/www\.facebook\.com\/[^"]+)"/) || [])[1] || '').replace(/\\/g, ''),
                download_url: (photo_url || '').replace(/\\/g, ''),
                width: w,
                height: h,
                stats: statsObj,
              })
            }
          }

          if (!foundMedia && sd_url) {
            videos.push({
              id: story.id || '',
              author_id: owner.id || '',
              text: postText,
              media_type: 'Video',
              thumbnail: thumb.replace(/\\/g, ''),
              url: ((s.match(/"url":\s*"(https:\/\/www\.facebook\.com\/[^"]+)"/) || [])[1] || '').replace(/\\/g, ''),
              download_sd: sd_url.replace(/\\/g, ''),
              download_hd: hd_url.replace(/\\/g, ''),
              duration: duration_sec,
              width: w,
              height: h,
              stats: statsObj,
            })
          } else if (!foundMedia && photo_url && !sd_url) {
            photos.push({
              id: story.id || '',
              author_id: owner.id || '',
              text: postText,
              media_type: 'Photo',
              url: ((s.match(/"url":\s*"(https:\/\/www\.facebook\.com\/[^"]+)"/) || [])[1] || '').replace(/\\/g, ''),
              download_url: photo_url.replace(/\\/g, ''),
              width: w,
              height: h,
              stats: statsObj,
            })
          }
        }
      } catch {}
    }

    return {
      users: Array.from(usersMap.values()),
      videos,
      photos,
    }
  }

  // ─── Búsqueda principal ──────────────────────────────────────
  async function buscarFacebook(query, limit) {
    const { client } = createClient()
    const tokens = await getSessionTokens(client)
    const variables = buildSearchVariables(query, limit)
    const body = buildBody(tokens, variables)

    const { data: text } = await client.post(graphql_url, body, {
      headers: {
        'User-Agent': ua,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*',
        'Referer': `${base}/search/top/?q=${encodeURIComponent(query)}`,
        'x-fb-friendly-name': 'SearchCometResultsPaginatedResultsQuery',
        'x-fb-lsd': tokens.lsd,
        'x-asbd-id': '359341',
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'Origin': base,
        'Cookie': getCookieString(),
      },
      responseType: 'text',
    })

    return parseEdges(text)
  }

  // ─── Endpoint ────────────────────────────────────────────────
  // GET /search/facebook?q=tom y jerry&limit=10&type=all
  app.get('/search/facebook', async (req, res) => {
    try {
      const { q, limit = '10', type = 'all' } = req.query

      if (!q)
        return res.status(400).json({
          status: false,
          message: 'Falta ?q=',
        })

      const lim = Math.min(Math.max(parseInt(limit) || 10, 1), 50)
      const { users, videos, photos } = await buscarFacebook(q, lim)

      // Filtrar por tipo
      const result = {}
      if (type === 'all' || type === 'users') result.users = users
      if (type === 'all' || type === 'videos') result.videos = videos
      if (type === 'all' || type === 'photos') result.photos = photos

      return res.json({
        status: true,
        query: q,
        limit: lim,
        stats: {
          users: users.length,
          videos: videos.length,
          photos: photos.length,
        },
        results: result,
      })

    } catch (err) {
      return res.status(500).json({ status: false, message: err.message })
    }
  })

}