module.exports = function (app) {
  const axios = require('axios')

  let json = null

  const gB = Buffer.from('ZXBzaWxvbmNsb3VkLm9yZw==', 'base64').toString()

  const headers = {
    origin: 'https://ytmp3.ai',
    referer: 'https://ytmp3.ai/',
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
    accept: '*/*'
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const ts = () => Math.floor(Date.now() / 1000)

  async function getjson() {
    if (json) return json
    const get = await axios.get('https://ytmp3.ai')
    const html = get.data
    const m = /var json = JSON\.parse\('([^']+)'\)/.exec(html)
    json = JSON.parse(m[1])
    return json
  }

  function authorization() {
    let e = ''
    for (let i = 0; i < json[0].length; i++) {
      e += String.fromCharCode(
        json[0][i] - json[2][json[2].length - (i + 1)]
      )
    }
    if (json[1]) e = e.split('').reverse().join('')
    return e.length > 32 ? e.slice(0, 32) : e
  }

  function ekstrakid(url) {
    const m =
      /youtu\.be\/([a-zA-Z0-9_-]{11})/.exec(url) ||
      /v=([a-zA-Z0-9_-]{11})/.exec(url) ||
      /\/shorts\/([a-zA-Z0-9_-]{11})/.exec(url) ||
      /\/live\/([a-zA-Z0-9_-]{11})/.exec(url)

    if (!m) throw new Error('invalid youtube url')
    return m[1]
  }

  async function init() {
    const key = String.fromCharCode(json[6])
    const url = `https://epsilon.${gB}/api/v1/init?${key}=${authorization()}&t=${ts()}`
    const initRes = await axios.get(url, { headers })

    if (initRes.data.error && initRes.data.error !== 0 && initRes.data.error !== '0') {
      throw new Error(JSON.stringify(initRes.data))
    }

    return initRes.data
  }

  async function convert(converturl, id, format) {
    const convert = await axios.get(
      converturl + '&v=' + id + '&f=' + format + '&t=' + ts(),
      { headers }
    )

    if (convert.data.error && convert.data.error !== 0) {
      throw new Error(JSON.stringify(convert.data))
    }

    return convert.data
  }

  async function progress(urlprogress) {
    for (;;) {
      await sleep(3000)

      const progressRes = await axios.get(urlprogress + '&t=' + ts(), { headers })

      if (progressRes.data.error && progressRes.data.error !== 0) {
        throw new Error(JSON.stringify(progressRes.data))
      }

      if (progressRes.data.progress === 3) return progressRes.data
    }
  }

  async function ytmp3(url, format = 'mp3') {
    await getjson()

    const id = ekstrakid(url)
    const initdata = await init()

    let convertdata = await convert(initdata.convertURL, id, format)

    if (convertdata.redirect === 1 && convertdata.redirectURL) {
      const redirect = await axios.get(convertdata.redirectURL + '&t=' + ts(), { headers })
      convertdata = redirect.data
    }

    if (convertdata.downloadURL && !convertdata.progressURL) {
      return {
        id,
        title: convertdata.title,
        format,
        download: convertdata.downloadURL
      }
    }

    const dataprogress = await progress(convertdata.progressURL)

    return {
      id,
      title: dataprogress.title,
      format,
      download: convertdata.downloadURL
    }
  }

  // 🔥 ENDPOINT
  app.get('/download/ytd', async (req, res) => {
    try {
      const { url, format } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          error: 'Falta parámetro: url'
        })
      }

      const fmt = format === 'mp4' ? 'mp4' : 'mp3'

      const data = await ytmp3(url, fmt)

      return res.json({
        status: true,
        creator: "★︎ ɪ'ᴍ sʜᴀᴅᴏᴡ (シャドウ)",
        ...data
      })

    } catch (e) {
      return res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })
}