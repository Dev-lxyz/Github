const { generateImageWithLink } = require("../../lib/freegen");

module.exports = function (app) {

  app.get("/ai/freegen-image", async (req, res) => {
    try {
      const { prompt } = req.query;

      if (!prompt) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro prompt"
        });
      }

      const result = await generateImageWithLink(prompt);

      if (result.result?.error) {
        return res.status(500).json({
          status: false,
          ...result
        });
      }

      res.status(200).json({
        status: true,
        ...result
      });

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      });
    }
  });

};