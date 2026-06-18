const axios = require('axios');

module.exports = function(app) {
  app.get('/reaction/blush', async (req, res) => {
    try {
      const { data } = await axios.get(
        'https://raw.githubusercontent.com/Dev-lxyz/alya/main/sfw/blush.json'
      );

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(500).json({
          status: false,
          error: "JSON vacío o inválido"
        });
      }

      const pick = data[Math.floor(Math.random() * data.length)];
      const name = pick.split('/').pop();

      res.json({
        status: true,
        data: {
          name,
          dl: pick
        }
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: "Error al obtener reacción",
        detail: err.message
      });
    }
  });

};