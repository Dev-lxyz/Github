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

  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function formatNumber(num) {
    return Number(num || 0).toLocaleString("en-US");
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;
  }

  async function getClientId() {
    if (cachedClientId) return cachedClientId;

    const html = await axios.get("https://soundcloud.com", { headers: HEADERS });
    const scripts = html.data.match(/https:\/\/a-v2\.sndcdn\.com\/assets\/.+?\.js/g);

    for (const js of scripts) {
      const res = await axios.get(js);
      const match = res.data.match(/client_id\s*:\s*"([a-zA-Z0-9]{32})"/);
      if (match) {
        cachedClientId = match[1];
        return cachedClientId;
      }
    }

    throw new Error("No se pudo obtener client_id");
  }

  async function resolveStream(track, client_id) {
    const transcoding = track.media?.transcodings?.find(
      t => t.format.protocol === "progressive"
    );

    if (!transcoding) return null;

    const res = await axios.get(transcoding.url, {
      headers: HEADERS,
      params: {
        client_id,
        track_authorization: track.track_authorization
      }
    });

    return res.data.url;
  }

  app.get("/api/play/soundcloud", async (req, res) => {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          status: false,
          error: 'Falta parámetro "q"'
        });
      }

      const client_id = await getClientId();
      const search = await axios.get(`${BASE}/search/tracks`, {
        headers: HEADERS,
        params: {
          q,
          client_id,
          limit: 1
        }
      });

      const track = search.data?.collection?.[0];

      if (!track) {
        return res.status(404).json({
          status: false,
          error: "No se encontró resultado"
        });
      }

      const download_url = await resolveStream(track, client_id);

      res.json({
        status: true,
        result: {
          title: track.title,
          artist: track.user?.username,
          duration: formatDuration(track.duration),
          created: formatDate(track.created_at),
          plays: formatNumber(track.playback_count),
          likes: formatNumber(track.likes_count),
          comments: formatNumber(track.comment_count),
          genre: track.genre,
          description: track.description,
          image: track.artwork_url
            ? track.artwork_url.replace("-large", "-t500x500")
            : null,
          link: track.permalink_url,
          url: download_url || null
        }
      });

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      });
    }
  });
};