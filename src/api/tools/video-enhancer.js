const fs = require("fs")
const path = require("path")

module.exports = function (app) {

  const PRODUCT_CODE = "067003"
  const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36"
  ]

  function randomSerial() {
    return Math.floor(Math.random() * 36 ** 6)
      .toString(36)
      .padStart(6, "0")
  }

  function pickUA() {
    return USER_AGENTS[
      Math.floor(Math.random() * USER_AGENTS.length)
    ]
  }

  function headers(ua) {
    return {
      "user-agent": ua,
      "accept": "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "origin": "https://unblurimage.ai",
      "referer": "https://unblurimage.ai/",
      "product-serial": randomSerial(),
      "product-code": PRODUCT_CODE
    }
  }

  async function jsonRequest(url, options) {
    const res = await fetch(url, options)
    const text = await res.text()

    if (!res.ok) {
      throw new Error(`${res.status} ${text.slice(0, 200)}`)
    }

    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms))

  async function pollJob(jobId, hdrs) {
    const url =
      `https://api.unwatermark.ai/api/web/unblurimage/v1/video-enhancer/get-job/${jobId}`

    while (true) {
      const data = await jsonRequest(url, {
        headers: hdrs
      })

      const result = data?.result

      if (
        result?.status === 1 &&
        result?.output_url?.length
      ) {
        return result
      }

      if (result?.status === 2) {
        throw new Error("Job failed")
      }

      await sleep(2500)
    }
  }

  // ───── GET /tools/video-enhancer ─────
  app.get("/tools/video-enhancer", async (req, res) => {
    try {
      const {
        url,
        resolution = "2k"
      } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta parametro ?url="
        })
      }

      const resolutions = ["2k", "4k"]

      if (!resolutions.includes(
        String(resolution).toLowerCase()
      )) {
        return res.status(400).json({
          status: false,
          message: "Resolution válida: 2k, 4k"
        })
      }

      const ua = pickUA()
      const hdrs = headers(ua)

      // descargar video temporal
      const video = await fetch(url, {
        headers: {
          "user-agent": ua
        }
      })

      if (!video.ok) {
        throw new Error("No se pudo descargar el video")
      }

      const buffer = Buffer.from(
        await video.arrayBuffer()
      )

      const fileName =
        Date.now() + ".mp4"

      // pedir upload url
      const form1 = new FormData()
      form1.append(
        "video_file_name",
        fileName
      )

      const uploadData =
        await jsonRequest(
          "https://api.unwatermark.ai/api/web/common/upload/video",
          {
            method: "POST",
            headers: hdrs,
            body: form1
          }
        )

      const uploadUrl =
        uploadData.result.url

      const objectUrl =
        uploadUrl.split("?")[0]

      // subir video
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "user-agent": ua,
          "content-type": "video/mp4"
        },
        body: buffer
      })

      if (!put.ok) {
        throw new Error("Error subiendo video")
      }

      // crear job
      const form2 = new FormData()

      form2.append(
        "original_video_url",
        objectUrl
      )

      form2.append(
        "resolution",
        resolution
      )

      form2.append(
        "is_preview",
        "false"
      )

      const job =
        await jsonRequest(
          "https://api.unwatermark.ai/api/web/unblurimage/v1/video-enhancer/create-job",
          {
            method: "POST",
            headers: hdrs,
            body: form2
          }
        )

      const jobId =
        job?.result?.job_id

      if (!jobId) {
        throw new Error(
          "No se pudo crear el job"
        )
      }

      const result =
        await pollJob(jobId, hdrs)

      return res.json({
        status: true,
        data: {
          job_id: jobId,
          resolution,
          remaining_free_times:
            result.remaining_free_times,
          download:
            result.output_url?.[0] || null
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