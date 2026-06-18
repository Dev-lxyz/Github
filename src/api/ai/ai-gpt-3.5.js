const axios = require('axios')
const fs = require('fs')
const crypto = require('crypto')

const SESSION_FILE = './chat-everywhere-session.json'
const MAX_MESSAGES = 10

const DEFAULT_MODEL = {
  id: 'gpt-3.5-turbo',
  name: 'GPT-3.5',
  maxLength: 12000,
  tokenLimit: 4000,
  completionTokenLimit: 2500,
  deploymentName: 'gpt-35',
}

// ─── Session ─────────────────────────────────────────────────
function createSession() {
  return {
    sessionId: crypto.randomUUID(),
    browserId: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  }
}

function readSession() {
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
  } catch {
    return null
  }
}

function writeSession(data) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2))
}

function getSession() {
  const data = readSession()
  if (!data || !Array.isArray(data.messages) || !data.browserId) {
    const fresh = createSession()
    writeSession(fresh)
    return fresh
  }
  const userCount = data.messages.filter(m => m.role === 'user').length
  if (userCount >= MAX_MESSAGES) {
    const fresh = createSession()
    writeSession(fresh)
    return fresh
  }
  return data
}

function normalizeMessages(messages) {
  return messages.map(m => ({
    pluginId: null,
    content: String(m.content || ''),
    role: m.role,
  }))
}

// ─── Chat ─────────────────────────────────────────────────────
async function chat({ input, systemPrompt = '', language = '', cookie = '', model = DEFAULT_MODEL }) {
  const session = getSession()

  const messages = [
    ...normalizeMessages(session.messages),
    { pluginId: null, content: input, fileList: [], role: 'user' },
  ]

  const body = {
    model,
    messages,
    prompt: systemPrompt,
    temperature: 0.5,
    enableConversationPrompt: false,
  }

  const headers = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0',
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/json',
    'output-language': language,
    'user-browser-id': session.browserId,
    'user-selected-plugin-id': '',
    'origin': 'https://chateverywhere.app',
    'referer': 'https://chateverywhere.app/id',
  }

  if (cookie) headers.cookie = cookie

  const res = await axios.post('https://chateverywhere.app/api/chat', body, {
    headers,
    timeout: 60000,
    responseType: 'text',
    validateStatus: () => true,
  })

  const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
  const ok = res.status >= 200 && res.status < 300

  if (ok) {
    session.messages.push({ role: 'user', content: input })
    session.messages.push({ role: 'assistant', content: text })
    session.updatedAt = Date.now()
    writeSession(session)
  }

  return { ok, status: res.status, response: text }
}

// ─── Endpoint ─────────────────────────────────────────────────
module.exports = function (app) {

  // GET /ai/chateverywhere?text=hola&system=eres un asistente&lang=es
  app.get('/ai/gpt-3.5', async (req, res) => {
    try {
      const {
        text,
        system = null,
        lang = '',
        cookie = '',
      } = req.query

      if (!text)
        return res.status(400).json({
          status: false,
          message: 'Falta ?text=',
        })

      const result = await chat({
        input: text,
        systemPrompt: system,
        language: lang,
        cookie,
        model: DEFAULT_MODEL,
      })

      if (!result.ok)
        return res.status(result.status).json({
          status: false,
          code: result.status,
          message: result.response,
        })

      return res.json({
        status: true,
        model: DEFAULT_MODEL.name,
        text,
        response: result.response,
      })

    } catch (err) {
      return res.status(500).json({ status: false, message: err.message })
    }
  })

  // GET /ai/chateverywhere/reset — reinicia la sesión
  app.get('/ai/gpt-3.5/reset', (req, res) => {
    try {
      const fresh = createSession()
      writeSession(fresh)
      return res.json({ status: true, message: 'Sesión reiniciada', sessionId: fresh.sessionId })
    } catch (err) {
      return res.status(500).json({ status: false, message: err.message })
    }
  })

}