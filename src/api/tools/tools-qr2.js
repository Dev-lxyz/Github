const QRCode = require('qrcode')
const { createCanvas, loadImage } = require('@napi-rs/canvas')

module.exports = function (app) {

  app.get('/tools/qr.php', async (req, res) => {
    try {
      const {
        text = 'shadow xd',
        color = '#000000',
        bg = '#ffffff',
        size = 500
      } = req.query

      const canvas = createCanvas(size, size)
      const ctx = canvas.getContext('2d')

      await QRCode.toCanvas(canvas, text, {
        width: size,
        margin: 1,
        color: {
          dark: color,
          light: bg
        }
      })
      
      const logoUrl = 'https://cloud-yume.vercel.app/files/rf3v.jpg'
      const logo = await loadImage(logoUrl)
      const logoSize = size * 0.25
      const x = (size - logoSize) / 2
      const y = (size - logoSize) / 2
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x - 8, y - 8, logoSize + 16, logoSize + 16)
      ctx.drawImage(logo, x, y, logoSize, logoSize)
      const buffer = await canvas.encode('png')

      res.setHeader('Content-Type', 'image/png')
      res.send(buffer)

    } catch (e) {
      res.json({
        status: false,
        error: e.message
      })
    }
  })

}