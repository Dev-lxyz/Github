/*module.exports = function (app) {
  const { chat } = require('../../lib/gemini-v2')

  app.get('/ai/gemini/v2', async (req, res) => {
    try {
      const { text, prompt } = req.query
      const input = text || prompt
      if (!input) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro 'text' o 'prompt'"
        })
      }

      return res.json({
        status: true,
        data: {
          response: await chat(input)
        }
      })

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message || 'Error en Gemini V2'
      })
    }
  })
}*/

module.exports = function (app) {
  const crypto = require('crypto')

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0'
  const HOME = 'https://gemini.google.com/app'
  const ENDPOINT = 'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate'

  const hex = n => crypto.randomBytes(n).toString('hex')
  const uuid = () => crypto.randomUUID().toUpperCase()
  const reqid = () => Math.floor(Math.random() * 900000) + 100000

  const pack = obj =>
    Buffer.from(JSON.stringify(obj)).toString('base64')

  const unpack = str => {
    try {
      return JSON.parse(
        Buffer.from(str, 'base64').toString()
      )
    } catch {
      return null
    }
  }

  async function bootstrap() {
    const res = await fetch(HOME, {
      headers: {
        'user-agent': UA,
        'accept-language': 'en-US,en;q=0.9'
      }
    })

    const setCookie =
      res.headers.getSetCookie?.() || []

    const cookie = setCookie
      .map(v => v.split(';')[0])
      .join('; ')

    const html = await res.text()

    return {
      cookie,
      bl: (html.match(/"cfb2h":"(.*?)"/) || [])[1] || '',
      fsid: (html.match(/"FdrFJe":"(.*?)"/) || [])[1] || '',
      uid: uuid()
    }
  }

  function buildBody(message, resume, uid) {
    const inner = [
      [message, 0, null, null, null, null, 0],
      ['en-US'],
      resume,
      '',
      hex(16),
      null,
      [1],
      1,
      null,
      null,
      1,
      0,
      null,
      null,
      null,
      null,
      null,
      [[0]],
      0,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      1,
      null,
      null,
      [4],
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      [2],
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      0,
      null,
      null,
      null,
      null,
      null,
      uid,
      null,
      [],
      null,
      null,
      null,
      null,
      null,
      null,
      2,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      1
    ]

    return (
      'f.req=' +
      encodeURIComponent(
        JSON.stringify([
          null,
          JSON.stringify(inner)
        ])
      ) +
      '&'
    )
  }

  function parseReply(raw) {
    const out = {
      text: '',
      conversationId: null,
      responseId: null,
      replyId: null
    }

    let best = ''

    for (const line of (raw || '').split('\n')) {
      const s = line.trim()

      if (!s.startsWith('[["wrb.fr"')) continue

      let outer

      try {
        outer = JSON.parse(s)
      } catch {
        continue
      }

      for (const row of outer) {
        if (
          !Array.isArray(row) ||
          row[0] !== 'wrb.fr' ||
          typeof row[2] !== 'string'
        ) continue

        let body

        try {
          body = JSON.parse(row[2])
        } catch {
          continue
        }

        const ids = body[1]

        if (Array.isArray(ids)) {
          out.conversationId = ids[0] || null
          out.responseId = ids[1] || null
        }

        const seg =
          Array.isArray(body[4])
            ? body[4][0]
            : null

        if (seg) {
          out.replyId = seg[0] || null

          if (Array.isArray(seg[1])) {
            const txt = seg[1].join('')

            if (txt.length > best.length)
              best = txt
          }
        }
      }
    }

    out.text = best.trim()

    return out
  }

  async function geminiChat(message, sessionId) {
    const sess =
      sessionId
        ? unpack(sessionId)
        : null

    const ctx =
      sess?.cookie
        ? sess
        : await bootstrap()

    const resume =
      sess?.resume
        ? [
            sess.resume[0] || '',
            sess.resume[1] || '',
            sess.resume[2] || '',
            null,
            null,
            null,
            null,
            null,
            null,
            ''
          ]
        : [
            '',
            '',
            '',
            null,
            null,
            null,
            null,
            null,
            null,
            ''
          ]

    const url =
      `${ENDPOINT}?bl=${encodeURIComponent(ctx.bl)}&f.sid=${encodeURIComponent(ctx.fsid)}&hl=en-US&_reqid=${reqid()}&rt=c`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'user-agent': UA,
        origin: 'https://gemini.google.com',
        referer: 'https://gemini.google.com/',
        'x-same-domain': '1',
        cookie: ctx.cookie
      },
      body: buildBody(
        String(message),
        resume,
        ctx.uid
      )
    })

    const raw = await res.text()
    const reply = parseReply(raw)

    return {
      response: reply.text || null,
      sessionId: pack({
        cookie: ctx.cookie,
        bl: ctx.bl,
        fsid: ctx.fsid,
        uid: ctx.uid,
        resume: [
          reply.conversationId,
          reply.responseId,
          reply.replyId
        ]
      })
    }
  }

  app.get('/ai/gemini/v2', async (req, res) => {
    try {
      const {
        text,
        prompt,
        sessionId
      } = req.query

      const input = text || prompt

      if (!input) {
        return res.status(400).json({
          status: false,
          error: 'Falta parametro ?text='
        })
      }

      const result = await geminiChat(
        input,
        sessionId
      )

      res.json({
        status: true,
        data: result
      })

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      })
    }
  })
}