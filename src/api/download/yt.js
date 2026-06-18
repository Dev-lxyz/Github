const axios = require('axios')

const API = 'https://api.rifkyshre.biz.id'
const ROUTE = '/scrape/ssyoutube'

// ─── Validar headers del cliente ─────────────────────────────
function validateHeaders(req) {
  const host = req.get('host') // tu dominio/host
  const referer = (req.headers['referer'] || '').toLowerCase()
  const accept = (req.headers['accept'] || '').toLowerCase()
  const contentType = (req.headers['content-type'] || '').toLowerCase()
  const userAgent = req.headers['user-agent'] || ''

  const errors = []

  if (!referer.includes(host))
    errors.push(`Referer: https://${host}/`)

  if (!accept.includes('application/json'))
    errors.push('Accept: application/json, text/plain, */*')

  if (!contentType.includes('application/json'))
    errors.push('Content-Type: application/json')

  if (!userAgent || userAgent.length < 20)
    errors.push('User-Agent: Mozilla/5.0 ...')

  return { valid: errors.length === 0, missing: errors, host }
}

// ─── Scraper ─────────────────────────────────────────────────
async function scrapeSSYoutube(url) {
  const response = await axios.post(
    `${API}${ROUTE}`,
    { url },
    {
      timeout: 60000,
      validateStatus: () => true,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://code.rifkyshre.biz.id',
        'Referer': 'https://code.rifkyshre.biz.id/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
    }
  )

  const body = response.data
  if (!body?.status) {
    throw Object.assign(
      new Error(body?.error || 'Error desconocido'),
      { code: body?.code ?? response.status }
    )
  }

  return { code: body.code, result: body.data }
}

module.exports = function (app) {

  // ─── GET ────────────────────────────────────────────────────
  app.get('/api/youtube2.php', async (req, res) => {
    try {
      const { url } = req.query

      if (!url)
        return res.status(400).json({
          status: false,
          message: 'Falta ?url=',
        })
/*
      const host = req.get('host')
      const referer = (req.headers['referer'] || '').toLowerCase()
      const userAgent = req.headers['user-agent'] || ''

      if (!referer.includes(host) || userAgent.length < 20)
        return res.status(403).json({
          status: false,
          message: 'Headers requeridos faltantes',
          required: {
            'Referer': `https://${host}/`,
            'User-Agent': 'Mozilla/5.0 ...',
          },
        })*/

      const data = await scrapeSSYoutube(url)
      return res.json({ status: true, ...data })

    } catch (err) {
      return res.status(500).json({ status: false, code: err.code, message: err.message })
    }
  })

  app.post('/api/youtube.php', async (req, res) => {
    try {
      const url = req.body?.url || req.query?.url

      if (!url)
        return res.status(400).json({
          status: false,
          message: 'Falta { url } en el body',
        })

      const { valid, missing, host } = validateHeaders(req)
      if (!valid)
        return res.status(403).json({
          status: false,
          message: 'Headers requeridos faltantes',
          missing,
          required: {
            'Referer': `https://${host}/`,
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
          },
        })

      const data = await scrapeSSYoutube(url)
      return res.json({ status: true, ...data })

    } catch (err) {
      return res.status(500).json({ status: false, code: err.code, message: err.message })
    }
  })

}