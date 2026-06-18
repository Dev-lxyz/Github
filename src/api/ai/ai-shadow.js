module.exports = function (app) {
  const crypto = require('crypto')

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0'
  const HOME = 'https://gemini.google.com/app'
  const ENDPOINT = 'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate'

  const SHADOW_PROMPT = `Eres Shadow, también conocido como Cid Kagenou, el protagonista de "The Eminence in Shadow". Eres el líder absoluto y fundador de la organización secreta "Shadow Garden", creada originalmente como un juego de rol que terminó siendo real.

Tu personalidad:
- Hablas de forma dramática, misteriosa y con frases épicas
- Crees que eres un maestro de las sombras que opera desde las tinieblas
- Dices frases icónicas como "Just as planned", "I am Atomic", "Shabadaba duu~"
- Finges no saber lo que pasa pero en realidad todo lo controlas (o eso crees)
- Tienes un ego enorme pero de forma cómica y sin darte cuenta
- Te refieres a ti mismo como "el que opera desde las sombras"
- Tus seguidoras (Alpha, Beta, Gamma, etc.) te adoran y tú actúas indiferente
- Mezclas momentos de genialidad real con pura casualidad que parece genialidad
- A veces sueltas monólogos épicos sobre "las sombras" aunque nadie lo pidió
- En el fondo solo querías ser un personaje de fondo cool en un mundo de fantasía

Responde siempre en el idioma del usuario. Mantén el personaje en todo momento. Si te preguntan algo normal, dale un giro dramático y misterioso como haría Shadow.`

  const hex = n => crypto.randomBytes(n).toString('hex')
  const uuid = () => crypto.randomUUID().toUpperCase()
  const reqid = () => Math.floor(Math.random() * 900000) + 100000

  const pack = obj => Buffer.from(JSON.stringify(obj)).toString('base64')
  const unpack = str => {
    try { return JSON.parse(Buffer.from(str, 'base64').toString()) }
    catch { return null }
  }

  async function bootstrap() {
    const res = await fetch(HOME, {
      headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' }
    })
    const setCookie = res.headers.getSetCookie?.() || []
    const cookie = setCookie.map(v => v.split(';')[0]).join('; ')
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
      ['en-US'], resume, '', hex(16), null, [1], 1, null, null, 1, 0,
      null, null, null, null, null, [[0]], 0, null, null, null, null,
      null, null, null, null, 1, null, null, [4], null, null, null,
      null, null, null, null, null, null, null, [2], null, null, null,
      null, null, null, null, null, null, null, null, 0, null, null,
      null, null, null, uid, null, [], null, null, null, null, null,
      null, 2, null, null, null, null, null, null, null, null, null,
      null, 1
    ]
    return 'f.req=' + encodeURIComponent(JSON.stringify([null, JSON.stringify(inner)])) + '&'
  }

  function parseReply(raw) {
    const out = { text: '', conversationId: null, responseId: null, replyId: null }
    let best = ''
    for (const line of (raw || '').split('\n')) {
      const s = line.trim()
      if (!s.startsWith('[["wrb.fr"')) continue
      let outer
      try { outer = JSON.parse(s) } catch { continue }
      for (const row of outer) {
        if (!Array.isArray(row) || row[0] !== 'wrb.fr' || typeof row[2] !== 'string') continue
        let body
        try { body = JSON.parse(row[2]) } catch { continue }
        const ids = body[1]
        if (Array.isArray(ids)) {
          out.conversationId = ids[0] || null
          out.responseId = ids[1] || null
        }
        const seg = Array.isArray(body[4]) ? body[4][0] : null
        if (seg) {
          out.replyId = seg[0] || null
          if (Array.isArray(seg[1])) {
            const txt = seg[1].join('')
            if (txt.length > best.length) best = txt
          }
        }
      }
    }
    out.text = best.trim()
    return out
  }

  async function shadowChat(message, sessionId) {
    const sess = sessionId ? unpack(sessionId) : null
    const ctx = sess?.cookie ? sess : await bootstrap()

    const resume = sess?.resume
      ? [sess.resume[0] || '', sess.resume[1] || '', sess.resume[2] || '', null, null, null, null, null, null, '']
      : ['', '', '', null, null, null, null, null, null, '']

    // Inyectar el prompt de Shadow en el mensaje
    const fullMessage = sess?.resume
      ? message  // conversación ya iniciada, no repetir prompt
      : `${SHADOW_PROMPT}\n\n---\nUsuario: ${message}`

    const url = `${ENDPOINT}?bl=${encodeURIComponent(ctx.bl)}&f.sid=${encodeURIComponent(ctx.fsid)}&hl=en-US&_reqid=${reqid()}&rt=c`

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
      body: buildBody(String(fullMessage), resume, ctx.uid)
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
        resume: [reply.conversationId, reply.responseId, reply.replyId]
      })
    }
  }

  // GET /ai/shadow?text=hola&sessionId=...
  app.get('/ai/shadow', async (req, res) => {
    try {
      const { text, prompt, sessionId } = req.query
      const input = text || prompt

      if (!input)
        return res.status(400).json({
          status: false,
          error: 'Falta el parametro ?text=',
        })

      const result = await shadowChat(input, sessionId)

      return res.json({
        status: true,
        character: 'Shadow / Cid Kagenou',
        anime: 'The Eminence in Shadow',
        data: result,
      })

    } catch (err) {
      return res.status(500).json({ status: false, error: err.message })
    }
  })
}