module.exports = function (app) {
  const axios     = require('axios')
  const { wrapper }   = require('axios-cookiejar-support')
  const { CookieJar } = require('tough-cookie')
  const crypto    = require('crypto')

  const BASE = 'https://quillbot.com'
  const UA   = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36'

  /* ─── helpers ──────── */
  const uuid = () => crypto.randomUUID()
  const hex  = n  => crypto.randomBytes(n).toString('hex')

  function sentryHeaders() {
    const traceId    = hex(16)
    const spanId     = hex(8)
    const sampleRand = Math.random()
    return {
      'baggage'      : `sentry-environment=prod,sentry-release=v42.51.6,sentry-public_key=5743ef12f4887fc460c7968ebb2de54d,sentry-trace_id=${traceId},sentry-sampled=false,sentry-sample_rand=${sampleRand},sentry-sample_rate=0.01`,
      'sentry-trace' : `${traceId}-${spanId}-0`
    }
  }

  /* ─── build a fresh client per request ────────────────────── */
  async function buildClient() {
    const jar    = new CookieJar()
    const client = wrapper(axios.create({
      jar,
      withCredentials: true,
      decompress     : true,
      validateStatus : () => true,
      timeout        : 120000
    }))

    const set = (name, value) =>
      jar.setCookie(`${name}=${value}; Path=/; Domain=quillbot.com; Secure; SameSite=None`, BASE)

    await set('qbDeviceId',              uuid())
    await set('ajs_anonymous_id',        uuid())
    await set('anonID',                  hex(8))
    await set('authenticated',           'false')
    await set('premium',                 'false')
    await set('acceptedPremiumModesTnc', 'false')
    await set('qdid',                    hex(16))

    return { client, jar }
  }

  /* ─── warmup ───────── */
  async function warmup(client) {
    await client.get(BASE, {
      headers: {
        'sec-ch-ua'                : `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
        'sec-ch-ua-mobile'         : '?1',
        'sec-ch-ua-platform'       : '"Android"',
        'upgrade-insecure-requests': '1',
        'user-agent'               : UA,
        'accept'                   : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'sec-fetch-site'           : 'none',
        'sec-fetch-mode'           : 'navigate',
        'sec-fetch-user'           : '?1',
        'sec-fetch-dest'           : 'document',
        'accept-language'          : 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    })
  }

  /* ─── generate ─────── */
  async function generate(prompt, category, aspectRatio) {
    const { client } = await buildClient()
    await warmup(client)

    const res = await client.post(
      `${BASE}/api/raven/generate/image`,
      {
        prompt,
        category,
        aspectRatio,
        promptId: 'image/generate-image'
      },
      {
        headers: {
          'sec-ch-ua-platform': '"Android"',
          'platform-type'     : 'webapp',
          'qb-product'        : 'IMAGE-GENERATOR',
          'sec-ch-ua'         : `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
          'sec-ch-ua-mobile'  : '?1',
          'useridtoken'       : 'empty-token',
          'user-agent'        : UA,
          'accept'            : 'application/json, text/plain, */*',
          'webapp-version'    : '42.51.6',
          'content-type'      : 'application/json',
          'origin'            : BASE,
          'sec-fetch-site'    : 'same-origin',
          'sec-fetch-mode'    : 'cors',
          'sec-fetch-dest'    : 'empty',
          'referer'           : `${BASE}/ai-image-generator/i/${uuid()}`,
          'accept-language'   : 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          ...sentryHeaders()
        }
      }
    )

    const urls = (res.data?.data?.images || [])
      .map(v => v.downloadUrl)
      .filter(Boolean)

    return { status: res.status, urls }
  }

  /* ─── endpoint ─────── */
  app.get('/ai/quillbot/image', async (req, res) => {
    try {
      const {
        prompt,
        category     = 'Auto',
        aspect_ratio = '1:1'
      } = req.query

      if (!prompt) {
        return res.json({ status: false, error: "Falta parámetro ?prompt=" })
      }

      const VALID_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4']
      if (!VALID_RATIOS.includes(aspect_ratio)) {
        return res.json({
          status: false,
          error : `aspect_ratio inválido. Usa: ${VALID_RATIOS.join(', ')}`
        })
      }

      const { status, urls } = await generate(prompt, category, aspect_ratio)

      if (!urls.length) {
        return res.status(500).json({
          status: false,
          error : `Sin imágenes en la respuesta (HTTP ${status})`
        })
      }

      return res.json({
        status: true,
        prompt,
        category,
        aspect_ratio,
        total: urls.length,
        result: urls.length === 1 ? urls[0] : urls
      })

    } catch (e) {
      return res.status(500).json({ status: false, error: e.message })
    }
  })
}