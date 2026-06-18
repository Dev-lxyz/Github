module.exports = function (app) {
  const https = require('https')
  const crypto = require('crypto')

  const HOST = 'api.tongyi.com'
  const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'

  function randomDeviceId() {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz'
    let s = ''

    for (let i = 0; i < 24; i++) {
      s += chars[Math.floor(Math.random() * chars.length)]
    }

    return s
  }

  function post(path, payload, headers = {}) {
    const data =
      typeof payload === 'string'
        ? payload
        : JSON.stringify(payload)

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: HOST,
        path,
        method: 'POST',
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/json',
          'Referer': 'https://m.tongyi.com/',
          'x-Platform': 'tongyi',
          'X-LoginType': 'havana',
          'Content-Length': Buffer.byteLength(data),
          ...headers
        }
      }, res => {

        let body = ''

        res.setEncoding('utf8')

        res.on('data', chunk => {
          body += chunk
        })

        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body
          })
        })

      })

      req.on('error', reject)
      req.write(data)
      req.end()
    })
  }

  async function guestInit(deviceId) {

    const res = await post(
      '/dialog/guest/init',
      '{}',
      {
        'X-DeviceId': deviceId
      }
    )

    let json = {}

    try {
      json = JSON.parse(res.body)
    } catch {}

    const cookie =
      (res.headers['set-cookie'] || [])
        .map(v => v.split(';')[0])
        .join('; ')

    return {
      cookie,
      guestEnable:
        json?.data?.guestEnable !== false
    }
  }

  function parseStream(body) {

    const events = []

    for (const line of body.split('\n')) {

      const text = line.trim()

      if (!text.startsWith('data:')) continue

      const payload =
        text.slice(5).trim()

      if (
        !payload ||
        payload === '[DONE]'
      ) continue

      try {
        events.push(JSON.parse(payload))
      } catch {}

    }

    return events
  }

  async function tongyiChat(text, search = false) {

    const deviceId =
      randomDeviceId()

    const init =
      await guestInit(deviceId)

    if (!init.guestEnable) {
      throw new Error('Guest mode disabled')
    }

    const payload = {
      action: 'next',
      mode: 'chat',
      userAction: 'chat',
      requestId: crypto.randomUUID(),
      sessionId: '',
      parentMsgId: '',
      sessionType: 'text_chat',
      openSearch: search,
      contents: [
        {
          role: 'user',
          contentType: 'text',
          content: text
        }
      ]
    }

    const res = await post(
      '/dialog/guest/conversation',
      payload,
      {
        Accept: 'text/event-stream',
        Cookie: init.cookie,
        'X-DeviceId': deviceId
      }
    )

    const events =
      parseStream(res.body)

    const final =
      [...events].reverse().find(
        x => x.msgStatus === 'finished'
      ) || events.at(-1)

    if (!final) {
      throw new Error('Empty response')
    }

    return {
      text:
        (final.contents || [])
          .filter(v => v.contentType === 'text')
          .map(v => v.content)
          .join('\n')
          .trim(),

      think:
        (final.contents || [])
          .filter(v => v.contentType === 'think')
          .map(v => v.content)
          .join('\n')
          .trim() || null,

      sessionId:
        final.sessionId || null,

      msgId:
        final.msgId || null,

      parentMsgId:
        final.parentMsgId || null,

      stopReason:
        final.stopReason || null
    }
  }

  app.get('/ai/qwen', async (req, res) => {
    try {

      const {
        text,
        search
      } = req.query

      if (!text) {
        return res.json({
          status: false,
          error: 'Falta parametro ?text='
        })
      }

      const result =
        await tongyiChat(
          text,
          search === 'true'
        )

      res.json({
        status: true,
        data: result
      })

    } catch (err) {

      res.json({
        status: false,
        error: err.message
      })

    }
  })
}