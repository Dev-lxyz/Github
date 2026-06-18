const axios = require('axios');

module.exports = function(app) {

  app.get('/search/anghami', async (req, res) => {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        status: false,
        error: "Falta parámetro ?q="
      });
    }

    try {
      // 🔹 Intento 1 (API antigua - a veces revive)
      try {
        const { data } = await axios.get('https://api.anghami.com/gateway.php', {
          params: {
            type: 'search',
            query: q,
            limit: 10,
            output: 'json',
            language: 'en'
          },
          headers: {
            'User-Agent': 'Mozilla/5.0'
          },
          timeout: 10000
        });

        if (data?.results) {
          const results = data.results
            .filter(x => x.type === 'song')
            .map(x => ({
              id: x.id,
              title: x.title,
              artist: x.artist,
              album: x.album,
              duration: x.duration,
              image: x.thumbnail,
              url: `https://play.anghami.com/song/${x.id}`
            }));

          if (results.length > 0) {
            return res.json({
              status: true,
              source: "gateway",
              total: results.length,
              data: results
            });
          }
        }

      } catch (e) {
        // sigue al fallback
      }

      // 🔹 Intento 2 (scraping ligero)
      const searchUrl = `https://play.anghami.com/search/${encodeURIComponent(q)}`;

      const { data: html } = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 15000
      });

      // Extraer JSON embebido
      const match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/);

      if (!match) {
        throw new Error("Anghami bloqueó la petición (no se encontró data)");
      }

      const json = JSON.parse(match[1]);

      const songs = json?.search?.tracks || [];

      if (!songs.length) {
        throw new Error("Sin resultados");
      }

      const results = songs.slice(0, 10).map(x => ({
        id: x.id,
        title: x.title,
        artist: x.artist?.name,
        album: x.album?.title,
        duration: x.duration,
        image: x.image,
        url: `https://play.anghami.com/song/${x.id}`
      }));

      res.json({
        status: true,
        source: "scraping",
        total: results.length,
        data: results
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: "Anghami cambió su sistema o bloqueó la IP",
        detail: err.message
      });
    }
  });

};