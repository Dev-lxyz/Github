const axios = require('axios');

module.exports = function (app) {
  app.get('/canvas/bratv', async (req, res) => {
    try {
      const { text } = req.query;
      if (!text) {
        return res.status(400).json({ status: false, error: "Falta parámetro ?text=" });
      }

      // Endpoint de Brat animado (video)
      const videoUrl = `https://skyzxu-brat.hf.space/brat-animated?text=${encodeURIComponent(text)}`;

      const response = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://skyzxu-brat.hf.space/'
        }
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No se pudo obtener el video de la API.');
      }

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(response.data);

    } catch (err) {
      res.status(500).json({ status: false, error: err.message });
    }
  });
};