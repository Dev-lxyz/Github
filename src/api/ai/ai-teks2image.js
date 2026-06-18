module.exports = function (app) {

  const https = require('https')
  const crypto = require('crypto')
  const fs = require('fs')
  const path = require('path')

  class AIImageGenerator {

    constructor(req) {
      this.req = req
      this.baseURL = 'image.pollinations.ai'
    }

    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
        .replace(/[xy]/g, function (c) {
          const r = Math.random() * 16 | 0
          const v = c === 'x'
            ? r
            : (r & 0x3 | 0x8)

          return v.toString(16)
        })
    }

    async generateImage(prompt, options = {}) {

      const {
        width = 1024,
        height = 1024,
        model = 'flux',
        seed = Math.floor(Math.random() * 1000000),
        nologo = true
      } = options

      const encodedPrompt =
        encodeURIComponent(prompt)

      const url =
        `/prompt/${encodedPrompt}` +
        `?width=${width}` +
        `&height=${height}` +
        `&model=${model}` +
        `&seed=${seed}` +
        `&nologo=${nologo}`

      return new Promise((resolve, reject) => {

        const request = https.get({
          hostname: this.baseURL,
          path: url,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }, (img) => {

          if (img.statusCode !== 200) {
            reject(
              new Error(`HTTP ${img.statusCode}`)
            )
            return
          }

          const chunks = []

          img.on('data', (chunk) => {
            chunks.push(chunk)
          })

          img.on('end', async () => {

            try {

              const imageBuffer =
                Buffer.concat(chunks)

              if (!fs.existsSync('./files')) {
                fs.mkdirSync('./files')
              }

              const name =
                crypto.randomBytes(16)
                  .toString('hex') + '.png'

              const filePath =
                path.join(
                  process.cwd(),
                  'files',
                  name
                )

              fs.writeFileSync(
                filePath,
                imageBuffer
              )

              resolve({
                status: true,
                prompt,
                model,
                data: {
                  width,
                  height,
                  seed,
                  imageSize: imageBuffer.length,
                  mimeType: 'image/png',
                  url:
                    `${this.req.protocol}://` +
                    `${this.req.get('host')}` +
                    `/files/${name}`
                }
              })

            } catch (e) {
              reject(e)
            }

          })

        })

        request.on('error', reject)

        request.end()

      })

    }

  }

  app.get('/ai/teks2image', async (req, res) => {
    try {
      const {
        prompt,
        model = 'flux',
        width = 1024,
        height = 1024
      } = req.query

      if (!prompt) {
        return res.json({
          status: false,
          error: 'Falta prompt'
        })
      }

      const generator =
        new AIImageGenerator(req)

      const result =
        await generator.generateImage(
          prompt,
          {
            model,
            width,
            height
          }
        )

      res.json({
        status: true,
        result
      })

    } catch (e) {

      res.json({
        status: false,
        error: e.message
      })

    }

  })

}