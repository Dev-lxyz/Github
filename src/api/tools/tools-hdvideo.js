module.exports = function (app) {
  const axios = require("axios")
  const FormData = require("form-data")
  const crypto = require("crypto")

  const UA =
    "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36"

  const API = "https://api.unblurimage.ai/api/upscaler"

  const product = crypto
    .createHash("md5")
    .update(UA + process.platform + process.arch)
    .digest("hex")

  async function uploadMeta() {
    const form = new FormData()
    form.append("video_file_name", "video.mp4")

    const { data } = await axios.post(
      `${API}/v1/ai-video-enhancer/upload-video`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          "user-agent": UA,
          origin: "https://unblurimage.ai",
          referer: "https://unblurimage.ai/"
        }
      }
    )

    return data.result
  }

  async function uploadToOSS(uploadUrl, videoUrl) {
    const stream = await axios.get(videoUrl, { responseType: "stream" })

    await axios.put(uploadUrl, stream.data, {
      headers: { "content-type": "video/mp4" },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    })
  }

  async function createJob(cdnUrl, resolution) {
    const form = new FormData()
    form.append("original_video_file", cdnUrl)
    form.append("resolution", resolution)
    form.append("is_preview", "false")

    const { data } = await axios.post(
      `${API}/v2/ai-video-enhancer/create-job`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          "user-agent": UA,
          origin: "https://unblurimage.ai",
          referer: "https://unblurimage.ai/",
          "product-serial": product
        }
      }
    )

    if (data.code !== 100000) {
      throw new Error("Create job falló")
    }

    return data.result.job_id
  }

  async function poll(jobId) {
    while (true) {
      const { data } = await axios.get(
        `${API}/v2/ai-video-enhancer/get-job/${jobId}`,
        {
          headers: {
            "user-agent": UA,
            origin: "https://unblurimage.ai",
            referer: "https://unblurimage.ai/",
            "product-serial": product
          }
        }
      )

      if (data.code === 100000 && data.result?.output_url) {
        return data.result
      }

      if (data.code !== 300010) throw new Error("Job falló")

      await new Promise(r => setTimeout(r, 4000))
    }
  }

  app.get("/tools/hdvideo", async (req, res) => {
    try {
      const { url, resolution = "4k" } = req.query
      if (!url) {
        return res.status(400).json({
          status: false,
          error: "Parámetro url requerido"
        })
      }

      const upload = await uploadMeta()
      await uploadToOSS(upload.url, url)
      const cdnUrl = "https://cdn.unblurimage.ai/" + upload.object_name
      const jobId = await createJob(cdnUrl, resolution)
      const result = await poll(jobId)

      res.json({
        status: true,
        job_id: jobId,
        resolution,
        input: result.input_url,
        output: result.output_url
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })
}