const axios = require("axios")

module.exports = function (app) {

  const BASE = "https://sparkpix.ai"
  const REFERER = "https://sparkpix.ai/aitools/free-hd-upscaler"

  const API_UPLOAD_URL = `${BASE}/api/upload-url`
  const API_UPSCALE = `${BASE}/api/free-hd-upscale`

  const UA =
    "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Mobile"

  function parseScale(input = "4") {
    const n = String(input)

    if (["4", "4k", "4x"].includes(n)) return { scale: 4 }
    if (["3", "3k", "3x"].includes(n)) return { scale: 3 }
    return { scale: 2 }
  }

  async function readBufferFromUrl(url) {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "user-agent": UA
      },
      timeout: 15000
    })

    return {
      buffer: res.data,
      size: res.data.length,
      mime: res.headers["content-type"] || "image/jpeg"
    }
  }

  async function getUploadUrl(file) {
    const { data } = await axios.post(API_UPLOAD_URL, {
      contentType: file.mime,
      size: file.size,
      fileName: "image.jpg"
    }, {
      headers: {
        "content-type": "application/json",
        origin: BASE,
        referer: REFERER,
        "user-agent": UA
      },
      timeout: 10000
    })

    if (!data?.success) throw new Error("Upload URL failed")
    return data
  }

  async function putFile(uploadUrl, file) {
    await axios.put(uploadUrl, file.buffer, {
      headers: {
        "content-type": file.mime
      },
      timeout: 20000
    })
  }

  async function upscale(publicUrl, scale) {
    const { data } = await axios.post(API_UPSCALE, {
      imageUrl: publicUrl,
      scale
    }, {
      headers: {
        accept: "*/*",
        "content-type": "application/json",
        origin: BASE,
        referer: REFERER,
        "user-agent": UA
      },
      timeout: 60000
    })

    if (!data?.success) throw new Error("Upscale failed")
    return data
  }

  // ─── ENDPOINT ───────────────────────────────
  app.get("/tools/upscale", async (req, res) => {
    try {
      const { url, scale = "2" } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta parametro ?url="
        })
      }

      const parsedScale = parseScale(scale)

      // 1. download image
      const file = await readBufferFromUrl(url)

      // 2. get upload url
      const upload = await getUploadUrl(file)

      // 3. upload file
      await putFile(upload.uploadUrl, file)

      // 4. upscale
      const result = await upscale(upload.publicUrl, parsedScale.scale)

      return res.json({
        status: true,
        result: {
          original: url,
          upscale: result.resultUrl,
          scale: parsedScale.scale,
          processingTime: result.processingTime || null
        }
      })

    } catch (e) {
      return res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}