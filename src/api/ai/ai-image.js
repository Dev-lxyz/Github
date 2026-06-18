const axios = require('axios');
const FormData = require('form-data');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

async function uploadToCatbox(buffer, filename = 'ai_image.jpg') {
  try {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, { filename, contentType: 'image/jpeg' });

    const res = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
      httpsAgent: agent
    });

    return res.data;
  } catch (err) {
    throw new Error('Error al subir a Catbox: ' + err.message);
  }
}

module.exports = function (app) {
  app.get('/ai/image', async (req, res) => {
    try {
      const { prompt, size } = req.query;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ status: false, error: "El parámetro 'prompt' es obligatorio" });
      }

      const CONFIG = {
        prompt,
        size: size || '1024x1024'
      };

      const form = new FormData();
      form.append('Prompt', CONFIG.prompt);
      form.append('Language', 'spa_Latn');
      form.append('Size', CONFIG.size);
      form.append('Upscale', '1');

      const response = await axios.post('https://api.zonerai.com/zoner-ai/txt2img', form, {
        headers: { 
          ...form.getHeaders(), 
          'X-Client-Platform': 'web', 
          Origin: 'https://zonerai.com', 
          Referer: 'https://zonerai.com/' 
        },
        responseType: 'arraybuffer',
        httpsAgent: agent
      });

      const catboxUrl = await uploadToCatbox(Buffer.from(response.data));

      res.json({
        status: true,
        result: {
          prompt: CONFIG.prompt,
          size: CONFIG.size,
          dl_url: catboxUrl
        }
      });

    } catch (err) {
      res.status(500).json({ status: false, result: { error: err.message } });
    }
  });
};