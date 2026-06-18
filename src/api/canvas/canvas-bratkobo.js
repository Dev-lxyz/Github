module.exports = function (app) {

  const {
    createCanvas,
    loadImage,
    GlobalFonts
  } = require('@napi-rs/canvas')

  const fetch = require('node-fetch')
  const fs = require('fs')
  const path = require('path')

  const __dirname = '../../../files'
  const fontPath = path.join(__dirname, 'patrick.ttf')
  const template = 'https://raw.githubusercontent.com/Dev-lxyz/upload/main/uploads/v9ovz.jpeg'

  async function getBuffer(url) {
    const res = await fetch(url)

    if (!res.ok) {
      throw new Error('Gagal ambil template')
    }

    return Buffer.from(await res.arrayBuffer())
  }

  async function loadFont() {
    if (!fs.existsSync(__dirname)) {
      fs.mkdirSync(__dirname, { recursive: true })
    }

    if (!fs.existsSync(fontPath)) {
      const res = await fetch(
        'https://github.com/google/fonts/raw/main/ofl/patrickhand/PatrickHand-Regular.ttf'
      )

      const buff = await res.arrayBuffer()

      fs.writeFileSync(fontPath, Buffer.from(buff))
    }

    GlobalFonts.registerFromPath(fontPath, 'Hand')
  }

  function wrapText(ctx, text, maxWidth) {
    let words = text.split(' ')
    let lines = []
    let line = ''

    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' '
      let width = ctx.measureText(testLine).width

      if (width > maxWidth && n > 0) {
        lines.push(line)
        line = words[n] + ' '
      } else {
        line = testLine
      }
    }

    lines.push(line)
    return lines
  }

  async function makeMeme(text) {
    await loadFont()

    const buffer = await getBuffer(template)
    const bg = await loadImage(buffer)

    const canvas = createCanvas(bg.width, bg.height)
    const ctx = canvas.getContext('2d')

    ctx.drawImage(bg, 0, 0)

    ctx.fillStyle = '#111'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '85px Hand'

    const maxWidth = 520
    const lines = wrapText(ctx, text, maxWidth)

    const startY = 720

    ctx.save()
    ctx.translate(bg.width / 2, startY)
    ctx.rotate(0.0)

    ctx.globalAlpha = 0.95
    ctx.shadowColor = 'rgba(0,0,0,0.2)'
    ctx.shadowBlur = 2
    ctx.shadowOffsetY = 1

    lines.forEach((line, i) => {
      ctx.fillText(line.trim(), 0, i * 65)
    })

    ctx.restore()

    return canvas.toBuffer('image/png')
  }

  app.get('/canvas/kobobrat', async (req, res) => {
    try {
      const { text } = req.query

      if (!text) {
        return res.status(400).json({
          status: false,
          message: 'Falta el parámetro text'
        })
      }

      const buffer = await makeMeme(text)

      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': buffer.length
      })

      res.end(buffer)

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}