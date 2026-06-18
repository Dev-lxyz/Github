module.exports = function (app) {
  const axios = require('axios');

  async function getRedditAnimeMeme() {
    try {
      const response = await axios.get('https://meme-api.com/gimme/anime');
      if (response.data && response.data.url) {
        return {
          url: response.data.url,
          title: response.data.title || 'Meme anime random',
          source: 'reddit'
        };
      }
    } catch {}
    return null;
  }

  async function getRandomAnimeImage() {
    try {
      const response = await axios.get('https://api.nekosapi.com/v4/images/random');
      if (response.data && response.data.url) {
        return {
          url: response.data.url,
          title: 'Imagen anime random',
          source: 'anime-img'
        };
      }
    } catch {}
    return null;
  }

  app.get('/random/meme', async (req, res) => {
    try {
      // intento obtener meme de reddit
      let meme = await getRedditAnimeMeme();

      // fallback a imagen anime
      if (!meme) {
        meme = await getRandomAnimeImage();
      }

      if (!meme) {
        return res.status(502).json({
          status: false,
          error: 'No se pudo obtener meme'
        });
      }

      res.json({
        status: true,
        type: 'anime-meme',
        result: {
          image: meme.url,
          caption: meme.title,
          source: meme.source
        }
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      });
    }
  });
};