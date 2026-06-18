const axios = require("axios")

class GptService {

  static async process(input, options = {}) {
    try {
      const payload = {
        model: {
          id: "gpt-4",
          name: "GPT-4"
        },
        messages: [
          {
            role: "user",
            content: input
          }
        ],
        temperature: options.temperature ?? 1
      }

      const res = await axios.post(
        "https://chateverywhere.app/api/chat/",
        payload,
        {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/json",
            "Accept": "*/*"
          },
          validateStatus: () => true
        }
      )

      // devuelve lo que sea (JSON o HTML)
      return {
        status: res.status,
        data: res.data
      }

    } catch (err) {
      return {
        error: true,
        message: err.message
      }
    }
  }
}

module.exports = GptService