module.exports = function (app) {
  const axios = require("axios");
  const fs = require("fs");
  const path = require("path");
  const os = require("os");
  const { v4: uuidv4 } = require("uuid");
  const FormData = require("form-data");

  const MIME = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp"
  };

  const hdrs = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Origin": "https://imgupscaler.ai",
    "Referer": "https://imgupscaler.ai/",
    "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Linux"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
  };

  const api = axios.create({
    baseURL: "https://api.imgupscaler.ai",
    timeout: 60000
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function uploadImage(filePath) {
    const ext = path.extname(filePath).slice(1).toLowerCase();

    const form1 = new FormData();
    form1.append("file_name", `${uuidv4()}.${ext}`);

    const { data: reg } = await api.post(
      "/api/common/upload/upload-image",
      form1,
      {
        headers: {
          ...hdrs,
          ...form1.getHeaders(),
          "sec-fetch-site": "same-site"
        }
      }
    );

    const { url: uploadUrl, object_name } = reg.result;

    await axios.put(uploadUrl, fs.readFileSync(filePath), {
      headers: {
        "Content-Type": MIME[ext] || `image/${ext}`
      }
    });

    const form2 = new FormData();
    form2.append("object_name", object_name);

    const { data: signed } = await api.post(
      "/api/common/upload/sign-object",
      form2,
      {
        headers: {
          ...hdrs,
          ...form2.getHeaders(),
          "sec-fetch-site": "same-site"
        }
      }
    );

    return signed.result.url;
  }

  async function createJob(imageUrl, prompt) {
    const form = new FormData();

    form.append("model_name", "magiceraser_v4");
    form.append("prompt", prompt);
    form.append("ratio", "match_input_image");
    form.append("output_format", "jpg");
    form.append("original_image_url", imageUrl);

    const { data } = await axios.post(
      "https://api.magiceraser.org/api/magiceraser/v2/image-editor/create-job",
      form,
      {
        headers: {
          ...hdrs,
          ...form.getHeaders(),
          "authorization": "",
          "product-code": "magiceraser",
          "product-serial": "f794edea-0ec9-4008-a02c-f3a8de99f150",
          "timezone": "Asia/Jakarta",
          "sec-fetch-site": "cross-site",
        }
      }
    );

    return data.result.job_id;
  }

  async function pollJob(jobId, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      await sleep(3000);

      const { data } = await axios.get(
        `https://api.magiceraser.org/api/magiceraser/v1/ai-remove/get-job/${jobId}`
      );

      if (data.code === 100000 && data.result?.output_url) {
        return data.result;
      }
    }

    throw new Error("Timeout");
  }

  async function processImage(image, prompt) {
    const text = prompt || "Make it realistic";

    const response = await axios.get(image, {
      responseType: "arraybuffer"
    });

    const ext =
      path.extname(image.split("?")[0]).replace(".", "") || "jpg";

    const tempPath = path.join(
      os.tmpdir(),
      `${uuidv4()}.${ext}`
    );

    fs.writeFileSync(tempPath, response.data);

    const signedUrl = await uploadImage(tempPath);

    const jobId = await createJob(signedUrl, text);

    const result = await pollJob(jobId);

    fs.unlinkSync(tempPath);

    return {
      job_id: jobId,
      prompt: text,
      image: signedUrl,
      output: result.output_url
    };
  }

  app.get("/ai/img2img", async (req, res) => {
    try {
      const { image, prompt } = req.query;

      if (!image) {
        return res.status(400).json({
          status: false,
          error: "Falta image"
        });
      }

      const result = await processImage(image, prompt);

      res.json({
        status: true,
        result
      });

    } catch (err) {
      console.error("[IMG2IMG GET]", err.response?.data || err.message);

      res.status(500).json({
        status: false,
        error: "Error al generar imagen"
      });
    }
  });

  app.post("/ai/img2img", async (req, res) => {
    try {
      const { image, prompt } = req.body;

      if (!image) {
        return res.status(400).json({
          status: false,
          error: "Falta image"
        });
      }

      const result = await processImage(image, prompt);

      res.json({
        status: true,
        result
      });

    } catch (err) {
      console.error("[IMG2IMG POST]", err.response?.data || err.message);

      res.status(500).json({
        status: false,
        error: "Error al generar imagen"
      });
    }
  });
};