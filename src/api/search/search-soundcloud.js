module.exports = function (app) {
  const axios = require("axios");

  const BASE = "https://api-v2.soundcloud.com";

  const HEADERS = {
    Origin: "https://soundcloud.com",
    Referer: "https://soundcloud.com/",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
  };

  let cachedClientId = null;

  // 🔹 Formatear duración ms → mm:ss
  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  // 🔹 Formatear números 1000000 → 1,000,000
  function formatNumber(num) {
    return Number(num || 0).toLocaleString("en-US");
  }

  // 🔹 Formatear fecha ISO → dd/mm/yyyy
  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  async function getClientId() {
    if (cachedClientId) return cachedClientId;

    const html = await axios.get("https://soundcloud.com", { headers: HEADERS });
    const scripts = html.data.match(/https:\/\/a-v2\.sndcdn\.com\/assets\/.+?\.js/g);

    if (!scripts) throw new Error("No se pudieron encontrar scripts");

    for (const js of scripts) {
      const res = await axios.get(js);
      const match = res.data.match(/client_id\s*:\s*"([a-zA-Z0-9]{32})"/);
      if (match) {
        cachedClientId = match[1];
        return cachedClientId;
      }
    }

    throw new Error("No se pudo extraer client_id");
  }

  app.get("/search/soundcloud", async (req, res) => {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          status: false,
          error: 'Falta el parámetro "q"'
        });
      }

      const client_id = await getClientId();

      const response = await axios.get(`${BASE}/search/tracks`, {
        headers: HEADERS,
        params: {
          q,
          client_id,
          limit: 10
        }
      });

      const tracks = response.data?.collection;

      if (!tracks?.length) {
        return res.status(404).json({
          status: false,
          error: "No se encontraron resultados"
        });
      }

      res.json({
        status: true,
        count: tracks.length,
        results: tracks.map(t => ({
          id: t.id,
          title: t.title,
          artist: t.user?.username,
          duration: formatDuration(t.duration),
          likes: formatNumber(t.likes_count),
          plays: formatNumber(t.playback_count),
          comments: formatNumber(t.comment_count),
          created: formatDate(t.created_at),
          image: t.artwork_url,
          link: t.permalink_url
        }))
      });

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      });
    }
  });
};