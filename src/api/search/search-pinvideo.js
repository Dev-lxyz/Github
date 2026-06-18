const fetch = require('node-fetch')

module.exports = function (app) {

  const ORIGIN = "https://www.pinterest.com";
  const ENDPOINT = `${ORIGIN}/resource/BaseSearchResource/get/`;

  function buildHeaders(sourceUrl) {
    return {
      "Accept": "application/json, text/javascript, */*, q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "X-APP-VERSION": "0ddf807",
      "X-Pinterest-AppState": "active",
      "X-Pinterest-Source-Url": sourceUrl,
      "X-Pinterest-PWS-Handler": "www/search/[scope].js",
      "screen-dpr": "1.84",
      "Referer": `${ORIGIN}${sourceUrl}`,
      "Accept-Language": "es-419,es;q=0.9,en;q=0.8",
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.163 Mobile Safari/537.36"
    };
  }

  function buildUrl(query, scope, bookmark, pageSize) {
    const rs = "typed";
    const sourceUrl = `/search/${scope}/?q=${encodeURIComponent(query)}&rs=${encodeURIComponent(rs)}`;
    const options = {
      query,
      scope,
      rs,
      redux_normalize_feed: true,
      source_url: sourceUrl,
      static_feed: false,
      page_size: pageSize,
      ...(bookmark ? { bookmarks: [bookmark] } : {})
    };
    const data = encodeURIComponent(JSON.stringify({ options, context: {} }));
    return `${ENDPOINT}?source_url=${encodeURIComponent(sourceUrl)}&data=${data}&_=${Date.now()}`;
  }

  function isMp4(url) {
    if (!url) return false;
    return String(url).split("?")[0].toLowerCase().endsWith(".mp4");
  }

  function pickMp4(videoList) {
    if (!videoList || typeof videoList !== "object") return null;
    const order = ["V_1080P", "V_720P", "V_480P", "V_360P", "V_240P", "V_144P"];
    for (const k of order) {
      const u = videoList[k]?.url;
      if (isMp4(u)) return u;
    }
    for (const k of Object.keys(videoList)) {
      const u = videoList[k]?.url;
      if (isMp4(u)) return u;
    }
    return null;
  }

  function extractVideoUrl(pin) {
    const direct = pickMp4(pin?.videos?.video_list);
    if (direct) return direct;

    const pages = [
      ...(Array.isArray(pin?.story_pin_data?.pages) ? pin.story_pin_data.pages : []),
      ...(Array.isArray(pin?.story_pin_data?.pages_preview) ? pin.story_pin_data.pages_preview : [])
    ];

    for (const page of pages) {
      for (const block of (Array.isArray(page?.blocks) ? page.blocks : [])) {
        const u = pickMp4(block?.video?.video_list);
        if (u) return u;
      }
    }

    return null;
  }

  function pinUrl(pin) {
    return pin?.id ? `https://www.pinterest.com/pin/${pin.id}/` : null;
  }

  async function fetchPage(query, scope, bookmark, pageSize) {
    const sourceUrl = `/search/${scope}/?q=${encodeURIComponent(query)}&rs=typed`;
    const url = buildUrl(query, scope, bookmark, pageSize);

    const resp = await fetch(url, { headers: buildHeaders(sourceUrl) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const json = await resp.json();
    const rr = json.resource_response;

    if (!rr || rr.code !== 0) {
      throw new Error(`Pinterest error: ${rr?.message || "unknown"}`);
    }

    return {
      results: Array.isArray(rr.data?.results) ? rr.data.results : [],
      bookmark: rr.bookmark && rr.bookmark !== "-end-" ? rr.bookmark : null
    };
  }

  async function buildVideoLookup(query, maxPages, pageSize) {
    const byId = new Map();
    let bookmark = null;

    for (let page = 0; page < maxPages; page++) {
      const current = await fetchPage(query, "videos", bookmark, pageSize);

      for (const pin of current.results) {
        const u = extractVideoUrl(pin);
        if (isMp4(u) && pin.id) {
          byId.set(String(pin.id), u);
        }
      }

      if (!current.bookmark) break;
      bookmark = current.bookmark;
    }

    return byId;
  }

  app.get('/search/pinterest-video', async (req, res) => {
    try {
      const { q, limit = 10 } = req.query;

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Falta parámetro 'q'"
        });
      }

      const pageSize = 25;
      const maxPages = 3;

      let bookmark = null;
      const collected = [];

      for (let page = 0; page < maxPages && collected.length < limit; page++) {
        const current = await fetchPage(q, "pins", bookmark, pageSize);

        collected.push(...current.results.filter(p => p && p.type === "pin"));

        if (!current.bookmark) break;
        bookmark = current.bookmark;
      }

      // lookup solo videos
      const videoLookup = await buildVideoLookup(q, maxPages, pageSize);

      const results = [];
      const seen = new Set();

      for (const pin of collected) {
        const url = pinUrl(pin);
        if (!url || seen.has(url)) continue;

        seen.add(url);

        const video = extractVideoUrl(pin) || videoLookup.get(String(pin.id));
        if (!video || !isMp4(video)) continue;

        results.push({
          titulo: pin.title || pin.grid_title || null,
          url,
          video
        });

        if (results.length >= limit) break;
      }

      res.json({
        status: true,
        query: q,
        count: results.length,
        results
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      });
    }
  });

};