const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function (app) {

  async function threads(url) {
    const id = url.match(/post\/([^/?]+)/)?.[1];
    if (!id) return { result: [] };

    const res = await axios.get(`https://www.threads.net/@x/post/${id}`, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120",
        "accept-language": "en-US,en;q=0.9"
      }
    }).catch(() => null);

    if (!res?.data) return { result: [] };

    const $ = cheerio.load(res.data);

    const result = {
      text: null,
      author: null,
      avatar: null,
      media: []
    };

    result.text = $('meta[property="og:description"]').attr("content") || null;
    result.author = $('meta[name="author"]').attr("content") || null;

    const image = $('meta[property="og:image"]').attr("content");
    if (image) result.media.push({ type: "image", url: image });
    const scripts = res.data.match(/"playable_url":"(https:\/\/[^"]+)"/g);

    if (scripts) {
      for (const s of scripts) {
        const url = s.match(/https:\/\/[^"]+/)?.[0];
        if (url) {
          result.media.push({ type: "video", url });
        }
      }
    }

    const ogVideo = $('meta[property="og:video"]').attr("content");
    if (ogVideo) {
      result.media.push({ type: "video", url: ogVideo });
    }

    return result;
  }

  app.get("/download/threads", async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.json({
          status: false,
          error: "Falta ?url="
        });
      }

      const data = await threads(url);

      res.json({
        status: true,
        result: data
      });

    } catch (e) {
      res.json({
        status: false,
        error: e.message
      });
    }
  });

};