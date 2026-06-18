const axios = require('axios');

const BASE_URL = 'https://raw.githubusercontent.com/Dev-lxyz/alya/main/nsfw';

function makeHandler(category) {
  return async (req, res) => {
    try {
      const { data } = await axios.get(`${BASE_URL}/${category}.json`);

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
        data: { name, dl: pick }
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: "Error al obtener reacción",
        detail: err.message
      });
    }
  };
}

module.exports = function(app) {

  app.get('/reaction/nsfw/spank',    makeHandler('spank'));
  app.get('/reaction/nsfw/undress',  makeHandler('undress'));
  app.get('/reaction/nsfw/yuri',    makeHandler('yuri'));
  app.get('/reaction/nsfw/sixnine', makeHandler('sixnine'));
  app.get('/reaction/nsfw/anal',      makeHandler('anal'));
  app.get('/reaction/nsfw/fuck',    makeHandler('fuck'));
  app.get('/reaction/nsfw/suckboobs',    makeHandler('suckboobs'));
  app.get('/reaction/nsfw/cummoth',     makeHandler('cummoth'));
  app.get('/reaction/nsfw/cumshot',   makeHandler('cumshot'));
  app.get('/reaction/nsfw/cum',     makeHandler('cum'));
  app.get('/reaction/nsfw/lickfutanari',      makeHandler('lickfutanari'));
  app.get('/reaction/nsfw/lickdick',  makeHandler('lickdick'));
  app.get('/reaction/nsfw/lickass',   makeHandler('lickass'));
  app.get('/reaction/nsfw/handjob',     makeHandler('handjob'));
  app.get('/reaction/nsfw/grope', makeHandler('grope'));
  app.get('/reaction/nsfw/grabboobs',  makeHandler('grabboobs'));
  app.get('/reaction/nsfw/blowjob',  makeHandler('blowjob'));
  app.get('/reaction/nsfw/boobjob',     makeHandler('boobjob'));
  app.get('/reaction/nsfw/fap', makeHandler('fap'));
  app.get('/reaction/nsfw/footjob',     makeHandler('footjob'));
  app.get('/reaction/nsfw/fingering',     makeHandler('fingering'));
  app.get('/reaction/nsfw/creampie',  makeHandler('creampie'));
  app.get('/reaction/nsfw/facesitting',   makeHandler('facesitting'));
  app.get('/reaction/nsfw/futanari',    makeHandler('futanari'));
  app.get('/reaction/nsfw/pegging',     makeHandler('pegging'));
  app.get('/reaction/nsfw/bondage',  makeHandler('bondage'));
  app.get('/reaction/nsfw/deepthroat',     makeHandler('deepthroat'));
  app.get('/reaction/nsfw/thighjob',    makeHandler('thighjob'));
  app.get('/reaction/nsfw/yaoi',    makeHandler('yaoi'));  
  app.get('/reaction/nsfw/bukkake',   makeHandler('bukkake'));
  app.get('/reaction/nsfw/orgy',  makeHandler('orgy'));
  app.get('/reaction/nsfw/squirting',     makeHandler('squirting'));

};