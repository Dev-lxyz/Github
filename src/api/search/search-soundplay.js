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

  function formatNumber(num) {
    return Number(num || 0).toLocaleString("en-US");
  }

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

  // ================= PLAYLIST ROUTE =================

  app.get("/search/soundcloud-playlist", async (req, res) => {
    try {
      const { q, limit = 10 } = req.query;

      if (!q) {
        return res.status(400).json({
          status: false,
          error: 'Falta el parámetro "q"'
        });
      }

      const client_id = await getClientId();

      const response = await axios.get(`${BASE}/search/playlists`, {
        headers: HEADERS,
        params: {
          q,
          client_id,
          limit
        }
      });

      const playlists = response.data?.collection;

      if (!playlists?.length) {
        return res.status(404).json({
          status: false,
          error: "No se encontraron playlists"
        });
      }

      res.json({
        status: true,
        count: playlists.length,
        results: playlists.map(p => ({
          id: p.id,
          title: p.title,
          author: p.user?.username,
          tracks: p.track_count,
          likes: formatNumber(p.likes_count),
          created: formatDate(p.created_at),
          image: p.artwork_url || p.user?.avatar_url,
          link: p.permalink_url
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