const { askGemini } = require('../../lib/gemini');

module.exports = function (app) {

  app.get('/ai/gemini', async (req, res) => {
    try {
      const { prompt } = req.query;

      if (!prompt) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro 'prompt'"
        });
      }

      const response = await askGemini(prompt);

      return res.json({
        status: true,
        data: {
          prompt,
          response
        }
      });

    } catch (error) {
      console.error('[GEMINI ERROR]', error.message);

      return res.status(500).json({
        status: false,
        message: error.message || "Error al generar respuesta"
      });
    }
  });

};