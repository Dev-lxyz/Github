const axios = require('axios');

module.exports = function (app) {

  class GitaGPT {
    constructor() {
      this.host = 'https://gitagpt.org/api/ask/gita';
      this.headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://gitagpt.org/',
        'Origin': 'https://gitagpt.org'
      };
    }

    async ask(query) {
      try {
        const response = await axios.get(this.host, {
          params: {
            q: query,
            email: 'null',
            locale: 'en'
          },
          headers: this.headers
        });

        const res = response.data;

        if (!res.response) throw new Error("Teu meunang jawapan ti server!");

        return {
          status: true,
          data: {
            id: res.id,
            question: res.question,
            answer: res.response
          }
        };

      } catch (e) {
        return {
          status: false,
          error: e.message
        };
      }
    }
  }

  app.get('/ai/gitagpt', async (req, res) => {
    try {
      const { text } = req.query;

      if (!text) {
        return res.status(400).json({
          status: false,
          message: "Falta parámetro 'text'"
        });
      }

      const start = Date.now();

      const gita = new GitaGPT();
      const result = await gita.ask(text);

      res.status(result.status ? 200 : 500).json({
        status: result.status,
        ms: Date.now() - start + 'ms',
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