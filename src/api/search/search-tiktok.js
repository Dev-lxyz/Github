const http = require('http');
const https = require('https');
const axiosBase = require('axios');

const DEFAULT_TIMEOUT = 2500;
const SEARCH_CACHE_TTL = 15 * 1000;
const MAX_RESULTS = 20;
const DEFAULT_RESULTS = 10;

const axios = axiosBase.create({
  httpAgent: new http.Agent({ keepAlive: true, maxSockets: 50 }),
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 50 }),
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/116 Mobile Safari/537.36',
    Accept: 'application/json, text/plain, */*'
  }
});

const formatNumber = (num) =>
  new Intl.NumberFormat("en-US").format(num || 0);

const formatDuration = (sec) => {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
};

const tameText = (txt, fallback = "Unknown") => {
  if (!txt || typeof txt !== "string") return fallback;
  return txt.trim().replace(/\s+/g, " ");
};

const cache = new Map();
function cacheGet(key) {
  const it = cache.get(key);
  if (!it) return null;
  if (Date.now() > it.expire) {
    cache.delete(key);
    return null;
  }
  return it.value;
}
function cacheSet(key, value, ttlMs) {
  cache.set(key, { value, expire: Date.now() + ttlMs });
}

module.exports = function (app) {
  app.get('/search/tiktok', async (req, res) => {
    try {
      const q = (req.query.q || '').toString().trim();
      if (!q)
        return res.json({ status: false, error: "Query 'q' is required" });

      const count = Math.min(
        MAX_RESULTS,
        Math.max(1, Number(req.query.count) || DEFAULT_RESULTS)
      );

      const cacheKey = `tiktok:${q}:c:${count}`;
      const cached = cacheGet(cacheKey);
      if (cached)
        return res.json({
          status: true,
          query: q,
          count: cached.length,
          data: cached,
          cached: true
        });

      const params = new URLSearchParams({
        keywords: q,
        count: String(count),
        cursor: '0',
        HD: '1'
      });

      const { data } = await axios.post(
        'https://tikwm.com/api/feed/search',
        params.toString(),
        {
          headers: {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            cookie: 'current_language=en'
          }
        }
      );

      const videos = data?.data?.videos;
      if (!Array.isArray(videos) || videos.length === 0)
        return res.json({ status: false, error: "No videos found" });

      const results = videos.slice(0, count).map((v) => {
        const sizeMB = v.size
          ? (v.size / 1048576).toFixed(2) + " MB"
          : null;


        return {
          title: v.title || "",
          duration: formatDuration(v.duration),
          region: v.region || "",
          author: tameText(v.author?.unique_id),
          size_mb: sizeMB,
          status: v.play ? "Available" : "Unavailable",
          likes: formatNumber(v.digg_count),
          comments: formatNumber(v.comment_count),
          views: formatNumber(v.play_count),
          favorites: formatNumber(v.collect_count),
          shares: formatNumber(v.share_count),
          date: formatDate(v.create_time),
          download: v.play || null,
          watermark: v.wmplay || null,
          cover: v.cover || null,
          music: {
            title: tameText(v.music?.title, ""),
            author: tameText(v.music?.author, "")
          }
        };
      });

      cacheSet(cacheKey, results, SEARCH_CACHE_TTL);

      res.json({
        status: true,
        query: q,
        count: results.length,
        data: results
      });

    } catch (err) {
      res.json({
        status: false,
        error: "Error processing request"
      });
    }
  });
};