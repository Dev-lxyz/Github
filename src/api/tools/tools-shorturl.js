module.exports = function (app) {
  const crypto = require('crypto')
  const fetch = require('node-fetch')

  const owner = 'Dev-lxyz'
  const repo = 'upload'
  const filePath = 'upload/links.json'
  const token = process.env.GITHUB_TOKEN || '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'

  let urlMap = {}
  let shaCache = null
  let saveTimeout = null
  let loaded = false

  const githubHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ShortLink-API'
  }

  async function loadLinks() {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          headers: githubHeaders
        }
      )

      if (!res.ok) {
        throw new Error(`GitHub ${res.status}`)
      }

      const data = await res.json()

      shaCache = data.sha

      const content = Buffer
        .from(data.content.replace(/\n/g, ''), 'base64')
        .toString('utf8')

      urlMap = JSON.parse(content || '{}')
      loaded = true

      console.log(`[SHORTLINK] ${Object.keys(urlMap).length} links loaded`)
    } catch (e) {
      console.error('[SHORTLINK] Load error:', e.message)
      urlMap = {}
      loaded = true
    }
  }

  async function saveLinksNow() {
    try {
      const content = Buffer
        .from(JSON.stringify(urlMap, null, 2))
        .toString('base64')

      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            ...githubHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `update links (${Object.keys(urlMap).length})`,
            content,
            sha: shaCache
          })
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.message || `GitHub ${res.status}`
        )
      }

      shaCache = data.content?.sha || shaCache

      console.log('[SHORTLINK] Saved')
    } catch (e) {
      console.error('[SHORTLINK] Save error:', e.message)
    }
  }

  function saveLinks() {
    clearTimeout(saveTimeout)

    saveTimeout = setTimeout(async () => {
      await saveLinksNow()
      saveTimeout = null
    }, 5000)
  }

  loadLinks()

  app.get('/tools/shortlink.php', async (req, res) => {
    try {
      if (!loaded) {
        return res.status(503).json({
          status: false,
          error: 'Base de datos cargando...'
        })
      }

      let { url, id } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          error: 'Falta parametro ?url='
        })
      }

      url = decodeURIComponent(url)

      if (!/^https?:\/\//i.test(url)) {
        return res.status(400).json({
          status: false,
          error: 'URL inválida'
        })
      }

      if (id) {
        id = id
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9_-]/g, '')

        if (id.length < 3 || id.length > 20) {
          return res.status(400).json({
            status: false,
            error: 'ID debe tener entre 3 y 20 caracteres'
          })
        }

        if (urlMap[id]) {
          return res.status(409).json({
            status: false,
            error: 'Ese ID ya existe'
          })
        }
      }

      const hash =
        id ||
        crypto
          .createHash('md5')
          .update(url)
          .digest('hex')
          .slice(0, 6)

      urlMap[hash] = url

      saveLinks()

      const protocol =
        req.headers['x-forwarded-proto'] || 'https'

      const short =
        `${protocol}://${req.get('host')}/s/${hash}`

      res.json({
        status: true,
        data: {
          id: hash,
          short,
          original_url: url
        }
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })

  app.get('/s/:id', (req, res) => {
    try {
      const { id } = req.params

      if (!/^[a-z0-9_-]{3,20}$/i.test(id)) {
        return res.status(404).json({
          status: false,
          error: 'ID inválido'
        })
      }

      const target = urlMap[id]

      if (!target) {
        return res.status(404).json({
          status: false,
          error: 'URL no encontrada'
        })
      }

      return res.redirect(301, target)

    } catch (e) {
      return res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })
}