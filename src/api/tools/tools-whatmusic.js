const axios = require('axios');

module.exports = function(app) {

  app.get('/tools/whatmusic', async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          error: "Falta ?url= (audio)"
        });
      }
      
      const audio = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 20000
      });

      const { data } = await axios({
        method: 'POST',
        url: 'https://shazam-core.p.rapidapi.com/v1/tracks/recognize',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-RapidAPI-Key': 'TU_API_KEY_AQUI', // key xd
          'X-RapidAPI-Host': 'shazam-core.p.rapidapi.com'
        },
        data: audio.data
      });

      if (!data || !data.track) {
        return res.json({
          status: false,
          message: "No se reconoció la canción"
        });
      }

      const track = data.track;

      res.json({
        status: true,
        data: {
          title: track.title,
          artist: track.subtitle,
          album: track.sections?.find(s => s.type === 'SONG')?.metadata || [],
          release: track.sections?.find(s => s.type === 'SONG')?.metadata?.find(m => m.title === 'Released')?.text || null,
          genre: track.genres?.primary || null,
          cover: track.images?.coverart || null,
          url: track.url
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