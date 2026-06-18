const axios = require("axios")

module.exports = function (app) {

  app.get("/nsfw/boobs", async (req, res) => {
    try {
      const response = await axios.get(
        "https://nekobot.xyz/api/image?type=boobs"
      )

      const data = response.data

      if (!data?.success) {
        return res.status(500).json({
          status: false,
          message: "Error obteniendo imagen"
        })
      }

      return res.json({
        status: true,
        result: {
          type: "boobs",
          url: data.message
        }
      })

    } catch (e) {
      return res.status(500).json({
        status: false,
        message: e.response?.data || e.message
      })
    }
  })

}