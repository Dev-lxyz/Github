const axios = require("axios")

module.exports = function (app) {

  app.get("/download/douyin", async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro url"
        })
      }

      const response = await axios.post(
        "https://snapvideotools.com/api/snap",
        {
          text: url
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://snapvideotools.com/",
            "Origin": "https://snapvideotools.com"
          }
        }
      )

      const data = response.data?.data

      if (!data || !data.mediaUrls) {
        return res.status(404).json({
          status: false,
          message: "No se encontraron datos"
        })
      }

      const video = data.mediaUrls.find(
        v => v.type === "video"
      )

      const audio = data.mediaUrls.find(
        a => a.type === "audio"
      )

      res.status(200).json({
        status: true,
        result: {
          title: data.title || "",
          platform: data.platformName || "Douyin",
          video: video?.url || null,
          audio: audio?.url || null
        }
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}