module.exports = function (app) {
  const axios = require('axios')

  app.get('/ai/webpilot', async (req, res) => {
    try {
      const { q } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          error: 'Falta parámetro "q"'
        })
      }

      const r = await axios.post(
        'https://api.webpilotai.com/rupee/v1/search',
        { q: q, threadId: '' },
        {
          responseType: 'stream',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
            Accept: 'application/json,text/plain,*/*,text/event-stream',
            'Content-Type': 'application/json',
            authorization: 'Bearer null',
            origin: 'https://www.webpilot.ai'
          }
        }
      )

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders()

      let sources = []

      r.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n')

        for (let line of lines) {
          if (!line.startsWith('data:')) continue

          try {
            const j = JSON.parse(line.slice(5).trim())
            if (j.type === 'data' && j.data?.content && !j.data.section_id) {
              res.write(`data: ${JSON.stringify({ type: 'text', content: j.data.content })}\n\n`)
            }

            // Fuentes → las acumulamos
            if (j.action === 'using_internet' && j.data) {
              sources.push({ title: j.data.title, link: j.data.link })
              res.write(`data: ${JSON.stringify({ type: 'source', source: { title: j.data.title, link: j.data.link } })}\n\n`)
            }

          } catch {}
        }
      })

      r.data.on('end', () => {
        res.write(`data: ${JSON.stringify({ type: 'done', sources })}\n\n`)
        res.end()
      })

      r.data.on('error', (err) => {
        res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
        res.end()
      })

      req.on('close', () => r.data.destroy())

    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({ status: false, error: err.message })
      }
    }
  })
}