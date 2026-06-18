const axios = require("axios");
const FormData = require("form-data");

const BASE_URL = "https://www.freeaivideos.org";

const headers = {
  "user-agent": "Mozilla/5.0 (Linux; Android 15; Mobile) AppleWebKit/537.36 Chrome/147.0.0.0 Mobile Safari/537.36",
  "origin": BASE_URL,
  "referer": `${BASE_URL}/`,
  "accept": "*/*"
};

async function loadImage(input) {
  if (!input) return null;

  if (Buffer.isBuffer(input)) {
    return {
      buffer: input,
      filename: "image.jpg",
      mimetype: "image/jpeg"
    };
  }

  if (/^https?:\/\//i.test(input)) {
    const res = await axios.get(input, {
      responseType: "arraybuffer"
    });

    return {
      buffer: Buffer.from(res.data),
      filename: "image.jpg",
      mimetype: res.headers["content-type"] || "image/jpeg"
    };
  }

  throw new Error("Invalid image input");
}

async function createVideo({ prompt, image = null }) {
  const img = await loadImage(image);

  const form = new FormData();

  form.append("prompt", prompt || "");

  if (img) {
    form.append("initialFrame", img.buffer, {
      filename: img.filename,
      contentType: img.mimetype
    });
  }

  const { data } = await axios.post(
    `${BASE_URL}/api/video_generation`,
    form,
    {
      headers: {
        ...headers,
        ...form.getHeaders()
      },
      timeout: 60000
    }
  );

  if (!data?.request_id) {
    throw new Error("Failed to get request ID");
  }

  const requestId = data.request_id;

  const start = Date.now();

  while (true) {
    if (Date.now() - start > 10 * 60 * 1000) {
      throw new Error("Video generation timeout");
    }

    try {
      const poll = await axios.get(
        `${BASE_URL}/api/video_generation?request_id=${requestId}&prompt=`,
        {
          headers
        }
      );

      const result = poll.data || {};

      if (result.video_url) {
        return {
          status: true,
          code: 200,
          prompt,
          request_id: requestId,
          video: result.video_url,
          frame: result.frame_url || "",
          icon: result.frame_url_icon || ""
        };
      }
    } catch {}

    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

module.exports = async function FreeAIVideo(prompt, image = null) {
  try {
    return await createVideo({
      prompt,
      image
    });
  } catch (err) {
    return {
      status: false,
      code: 500,
      prompt,
      video: "",
      frame: "",
      icon: "",
      error: err.message
    };
  }
};