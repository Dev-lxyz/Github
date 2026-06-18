module.exports = function (app) {
  const axios = require("axios");
  const cheerio = require("cheerio");

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.mediafire.com/',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
  };

  function formatDate(date) {
    if (!date) return "";

    return new Date(date).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true
    });
  }

  async function scrapeMediaFire(url) {
    const instance = axios.create({
      maxRedirects: 6,
      timeout: 15000,
      headers
    });

    const { data, status } = await instance.get(url);

    if (status !== 200)
      throw new Error(`HTTP ${status}`);

    const $ = cheerio.load(data);

    const bodyText = $("body").text().toLowerCase();

    if (bodyText.includes("captcha") || bodyText.includes("verify you are not a robot"))
      throw new Error("Captcha detected — cannot bypass");

    let download =
      $("#downloadButton").attr("href") ||
      $("a#download_link").attr("href") ||
      $("a.input.popsok").attr("href") ||
      $("a.download-link").attr("href") ||
      $('a[href*="download"]').first().attr("href") ||
      null;

    if (!download)
      throw new Error("Download link not found");

    const filename =
      $(".filename").text().trim() ||
      $(".file-name").text().trim() ||
      $(".dl-btn-label").first().text().trim() ||
      null;

    let filesize = null;
    const sizeMatch = $(".dl-btn-label, .file-size, #download_link a")
      .text()
      .match(/\(([^)]+)\)|\s*(\d+(?:\.\d+)?\s*(?:MB|GB|KB|bytes?))/i);

    if (sizeMatch)
      filesize = sizeMatch[1] || sizeMatch[2] || null;

    const filetype =
      $(".filetype span, .file-type, .extension")
        .first()
        .text()
        .trim()
        .replace(/[\(\)]/g, "") ||
      (filename ? filename.split(".").pop().toUpperCase() : null);

    const uploaded =
      $('.details li:contains("Uploaded") span').text().trim() ||
      $(".upload-date").text().trim() ||
      $("time").text().trim() ||
      null;

    const description =
      $('meta[property="og:description"]').attr('content') ||
      'not found description.';

    let privacy = null;
    let owner_name = null;

    try {
      const quickKeyMatch = url.match(/\/file\/([^/]+)/i);

      if (quickKeyMatch) {
        const quickKey = quickKeyMatch[1];

        const api = await axios.get(
          `https://www.mediafire.com/api/1.5/file/get_info.php`,
          {
            params: {
              response_format: "json",
              quick_key: quickKey
            },
            timeout: 10000
          }
        );

        const info = api.data?.response?.file_info;

        if (info) {
          privacy = info.privacy;
          owner_name = info.owner_name;

          if (info.created) {
            uploaded = formatDate(info.created);
          }
        }
      }
    } catch {}

    return {
      filename: filename || "",
      filetype: filetype || "",
      filesize: filesize || "",
      uploaded: uploaded ? formatDate(uploaded) : "",
      privacy: privacy || "",
      owner_name: owner_name || "",
      description: description || undefined,
      download_url: download,
      original_url: url
    };
  }

  app.get("/download/mediafire", async (req, res) => {
    try {
      const { url } = req.query;

      if (!url)
        return res.status(400).json({
          status: false,
          data: null,
          error: "Missing parameter 'url'"
        });

      if (!/^https?:\/\/(www\.)?mediafire\.com\//i.test(url))
        return res.status(400).json({
          status: false,
          data: null,
          error: "Invalid MediaFire URL"
        });

      const result = await scrapeMediaFire(url);

      res.json({
        status: true,
        data: result
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        data: null,
        error: err.message
      });
    }
  });
};