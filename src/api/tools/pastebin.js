module.exports = function (app) {
  const axios = require("axios");

  async function getPastebinSource(url) {
    try {
      const match = url.match(
        /pastebin\.com\/([a-zA-Z0-9]+)/
      );

      if (!match) {
        throw new Error("URL Pastebin tidak valid!");
      }

      const pasteId = match[1];

      const rawUrl = `https://pastebin.com/raw/${pasteId}`;

      const response = await axios.get(rawUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0"
        },
        timeout: 10000
      });

      return {
        pasteId,
        rawUrl,
        content: response.data
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  app.get("/tools/pastebin", async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          error: "Falta el parámetro ?url="
        });
      }

      const result = await getPastebinSource(url);

      res.json({
        status: true,
        result
      });

    } catch (err) {
      console.error(
        "[PASTEBIN]",
        err.response?.data || err.message
      );

      res.status(500).json({
        status: false,
        error: err.message || "Error al obtener source"
      });
    }
  });
};