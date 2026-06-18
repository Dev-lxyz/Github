const axios = require("axios")

module.exports = function (app) {

  const LANGUAGES = {
    en: "English",
    id: "Indonesian",
    es: "Spanish",
    fr: "French",
    de: "German",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    ru: "Russian",
    ar: "Arabic"
  }

  app.get("/tools/image-prompt", async (req, res) => {
    try {
      const {
        url,
        language
      } = req.query
      
      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta parametro ?url="
        })
      }

      if (!language) {
        return res.status(400).json({
          status: false,
          message: "Falta parametro ?language=",
          availableLanguages: LANGUAGES
        })
      }

      if (!LANGUAGES[language]) {
        return res.status(400).json({
          status: false,
          message: "Idioma no válido",
          availableLanguages: LANGUAGES
        })
      }

      const proxy =
        `https://imageprompt.org/api/image/proxy?url=${encodeURIComponent(url)}`

      const { data: imageBuffer } = await axios.get(proxy, {
        responseType: "arraybuffer",
        timeout: 30000,
        headers: {
          referer: "https://imageprompt.org/image-to-prompt",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
      })

      const base64 = `data:image/webp;base64,${Buffer.from(imageBuffer).toString("base64")}`

      const { data } = await axios.post(
        "https://imageprompt.org/api/ai/prompts/image",
        {
          base64Url: base64,
          imageModelId: 0,
          language
        },
        {
          timeout: 60000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            origin: "https://imageprompt.org",
            referer: "https://imageprompt.org/image-to-prompt",
            "user-agent":
              "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
          }
        }
      )

      return res.json({
        status: true,
        result: {
          prompt: data.prompt,
          language: {
            code: language,
            name: LANGUAGES[language]
          },
          generatedAt: data.generatedAt || null
        }
      })

    } catch (e) {
      return res.status(500).json({
        status: false,
        message:
          typeof e.response?.data === "object"
            ? e.response.data
            : e.message
      })
    }
  })

}