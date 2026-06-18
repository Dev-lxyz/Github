const axios = require("axios")
const cheerio = require("cheerio")
const FormData = require("form-data")

module.exports = function (app) {

  async function aplemate(urls) {
    const baseUrl = "https://aplmate.com"

    const baseHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

      "X-Requested-With": "XMLHttpRequest"
    }

    try {
      const handshake = await axios.get(baseUrl, {
        headers: baseHeaders
      })

      const cookie =
        handshake.headers["set-cookie"]
          ?.map(c => c.split(";")[0])
          .join("; ") || ""

      const headers = {
        ...baseHeaders,
        Origin: baseUrl,
        Referer: baseUrl + "/",
        Cookie: cookie
      }

      const verifyRes = await axios.post(
        `${baseUrl}/action/userverify`,
        `url=${encodeURIComponent(urls)}`,
        {
          headers: {
            ...headers,
            "Content-Type":
              "application/x-www-form-urlencoded"
          }
        }
      )

      const mainForm = new FormData()

      mainForm.append("url", urls)

      mainForm.append(
        "cf-turnstile-response",
        verifyRes.data.token || ""
      )

      const mainRes = await axios.post(
        `${baseUrl}/action`,
        mainForm,
        {
          headers: {
            ...headers,
            ...mainForm.getHeaders()
          }
        }
      )

      const $ = cheerio.load(mainRes.data.html)

      const rawImg =
        $("img").first().attr("src") || ""

      const thumbnail = rawImg.replace(/\\/g, "")

      const infoContainer = $(".grid-item")
        .eq(1)
        .find(".grid-text")

      const trackForm = new FormData()

      trackForm.append(
        "data",
        $('input[name="data"]').val()
      )

      trackForm.append(
        "base",
        $('input[name="base"]').val()
      )

      trackForm.append(
        "token",
        $('input[name="token"]').val()
      )

      const finalRes = await axios.post(
        `${baseUrl}/action/track`,
        trackForm,
        {
          headers: {
            ...headers,
            ...trackForm.getHeaders()
          }
        }
      )

      const $final = cheerio.load(
        finalRes.data.data
      )

      const dl = $final("a.abutton").attr("href")

      return {
        success: true,
        title: infoContainer
          .find("span")
          .text()
          .trim(),

        artist: infoContainer
          .contents()
          .filter(function () {
            return this.nodeType === 3
          })
          .text()
          .trim(),

        thumbnail,

        download_link: dl.startsWith("http")
          ? dl
          : baseUrl + dl
      }

    } catch (error) {
      return {
        success: false,
        message: error.message
      }
    }
  }

  app.get("/download/aplmate", async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro url"
        })
      }

      const result = await aplemate(url)

      res.status(200).json({
        status: true,
        result
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}

/*
const axios = require('axios')
const { wrapper } = require('axios-cookiejar-support')
const { CookieJar } = require('tough-cookie')

const BASE = 'https://aplmate.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'

function createClient() {
  const jar = new CookieJar()
  return wrapper(axios.create({
    jar,
    withCredentials: true,
    timeout: 30000,
    headers: { 'User-Agent': UA },
  }))
}

function buildHeaders(cookie, extra = {}) {
  return {
    'User-Agent': UA,
    'Origin': BASE,
    'Referer': `${BASE}/es1`,
    'Cookie': cookie,
    ...extra,
  }
}

async function scrape(appleMusicUrl) {
  const client = createClient()

  // 1. Obtener cookie
  const page = await client.get(`${BASE}/es1`, { responseType: 'text' })
  const rawCookies = page.headers['set-cookie'] || []
  const cookie = rawCookies.map(s => s.split(';')[0]).join('; ')

  // 2. Verificar URL y obtener token
  const verify = await client.post(
    `${BASE}/action/userverify`,
    `url=${encodeURIComponent(appleMusicUrl)}`,
    {
      headers: buildHeaders(cookie, {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      }),
    }
  )

  const { success, token: verifyToken } = verify.data
  if (!success || !verifyToken)
    throw new Error('userverify no devolvió token — intenta de nuevo')

  // 3. Acción principal
  const r1 = await client.post(
    `${BASE}/action`,
    new URLSearchParams({
      url: appleMusicUrl,
      'cf-turnstile-response': verifyToken,
    }).toString(),
    {
      headers: buildHeaders(cookie, {
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
    }
  )

  const j1 = r1.data
  if (j1.error) throw new Error(`/action falló: ${j1.message}`)
  const actionHtml = j1.html || j1.data

  // 4. Extraer campos del HTML
  const dataMatch  = actionHtml.match(/name="data"\s+value='([^']+)'/)
  const baseMatch  = actionHtml.match(/name="base"\s+value="([^"]+)"/)
  const tokenMatch = actionHtml.match(/name="token"\s+value="([^"]+)"/)

  if (!dataMatch || !baseMatch || !tokenMatch)
    throw new Error('No se pudieron extraer los campos del HTML de /action')

  // 5. Obtener track
  const r2 = await client.post(
    `${BASE}/action/track`,
    new URLSearchParams({
      data: dataMatch[1],
      base: baseMatch[1],
      token: tokenMatch[1],
    }).toString(),
    {
      headers: buildHeaders(cookie, {
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
    }
  )

  const j2 = r2.data
  if (j2.error) throw new Error(`/action/track falló: ${j2.message}`)
  const trackHtml = j2.html || j2.data

  // 6. Extraer links y labels
  const links = [
    ...trackHtml.matchAll(/href="(https:\/\/cdndl\.aplmate\.com\/mp3\?token=[^"]+)"/g),
  ].map(m => m[1])

  const labels = [
    ...trackHtml.matchAll(/<span><span>([^<]+)<\/span><\/span>/g),
  ].map(m => m[1].trim())

  // 7. Decodear metadata
  let meta = {}
  try {
    meta = JSON.parse(Buffer.from(dataMatch[1], 'base64').toString())
  } catch {}

  return {
    meta,
    total: links.length,
    downloads: links.map((url, i) => ({
      label: labels[i] || `link-${i}`,
      url,
    })),
  }
}

// ─── Endpoint ────────────────────────────────────────────────
module.exports = function (app) {

  // GET /download/aplmate?url=https://music.apple.com/...
  app.get('/download/aplmate', async (req, res) => {
    try {
      const { url } = req.query

      if (!url)
        return res.status(400).json({
          status: false,
          message: 'Falta ?url=',
          example: '/download/aplmate?url=https://music.apple.com/us/album/...',
        })

      if (!url.includes('music.apple.com'))
        return res.status(400).json({
          status: false,
          message: 'La URL debe ser de Apple Music',
        })

      const result = await scrape(url)

      return res.json({
        status: true,
        meta: result.meta,
        total: result.total,
        downloads: result.downloads,
      })

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message,
      })
    }
  })

}
*/