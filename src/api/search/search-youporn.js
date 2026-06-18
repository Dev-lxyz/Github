const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {

  app.get('/search/youporn', async (req, res) => {
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

      const url = `https://www.youporn.com/search/?query=${encodeURIComponent(q)}`;

      const { data } = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });

      const $ = cheerio.load(data);
      const results = [];

      $(".video-box").each((i, el) => {
        if (results.length >= Number(limit)) return false;

        const title = $(el).find(".video-title").text().trim() || "No title";
        const path = $(el).find("a").attr("href");

        const link = path ? `https://www.youporn.com${path}` : null;

        const thumbnail =
          $(el).find("img").attr("data-src") ||
          $(el).find("img").attr("src") ||
          null;

        const duration = $(el).find(".video-duration").text().trim() || "-";

        if (link) {
          results.push({
            title,
            link,
            thumbnail,
            duration
          });
        }
      });

      if (!results.length) {
        return res.json({
          status: false,
          error: "No se encontraron resultados"
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
        error: "Error en youporn search",
        detail: err.message
      });
    }
  });

};