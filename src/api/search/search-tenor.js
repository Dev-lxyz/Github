const axios = require('axios');

const TENOR_API_KEY = "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ"; // Tu API Key

module.exports = function(app) {

  // 🔹 Función para formatear timestamp → dd/mm/yyyy
  function formatDate(timestamp) {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  app.get('/search/tenor', async (req, res) => {
    try {
      const { q, limit = 25 } = req.query;
      if (!q) return res.status(400).json({ status: false, error: "Falta parámetro 'q'" });

      const { data } = await axios.get('https://tenor.googleapis.com/v2/search', {
        params: {
          q,
          key: TENOR_API_KEY,
          limit,
          media_filter: "minimal",
          content_filter: "high"
        }
      });

      const results = data.results.map(gif => ({
        id: gif.id,
        title: gif.content_description || "",
        created: formatDate(gif.created), // 🔥 Formateado
        mp4: gif.media_formats?.mp4?.url || "",
        gif: gif.media_formats?.gif?.url || ""
      }));

      res.json({
        status: true,
        result: results
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      });
    }
  });

};