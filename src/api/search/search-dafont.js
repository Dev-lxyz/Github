const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function (app) {

  app.get("/search/dafont", async (req, res) => {
    try {
      const { q, limit } = req.query;

      if (!q) {
        return res.status(400).json({
          status: false,
          error: "Falta parámetro: q"
        });
      }

      if (!limit || isNaN(limit)) {
        return res.status(400).json({
          status: false,
          error: "El parámetro limit es obligatorio y debe ser número"
        });
      }

      const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0",
        "Accept-Language": "es-ES,es;q=0.9",
        "Referer": "https://www.dafont.com/"
      };

      const url = `https://www.dafont.com/search.php?q=${encodeURIComponent(q)}`;

      const { data } = await axios.get(url, { headers: HEADERS });
      const $ = cheerio.load(data);

      const results = [];

      $("div.preview a").each((i, el) => {
        if (results.length >= Number(limit)) return false;

        const href = $(el).attr("href");
        if (!href) return;

        const link = "https://www.dafont.com/" + href;

        // sacar nombre desde URL
        const name = href.split(".php")[0].split("/").pop();

        results.push({
          name,
          link
        });
      });

      if (!results.length) {
        return res.json({
          status: false,
          error: "No se encontraron fuentes"
        });
      }

      res.json({
        status: true,
        query: q,
        total: results.length,
        results
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: "Error en Dafont search",
        detail: err.message
      });
    }
  });

};