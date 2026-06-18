const axios = require('axios');

module.exports = function (app) {

  const conversations = {};

  async function chatWithAI(text, logic) {
    try {
      const { data } = await axios.post("https://chateverywhere.app/api/chat/", {
        "model": {
          "id": "gpt-4",
          "name": "GPT-4",
          "maxLength": 32000,
          "tokenLimit": 8000,
          "completionTokenLimit": 5000,
          "deploymentName": "gpt-4"
        },
        "messages": [{ "role": "user", "content": text }],
        "prompt": logic,
        "temperature": 0.5
      }, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        }
      });

      return data;
    } catch {
      return null;
    }
  }

  app.get('/ai/gpt-4', async (req, res) => {
    try {
      const { text, user_id, quoted, prompt } = req.query;

      if (!text) {
        return res.status(400).json({
          status: false,
          message: "Falta parámetro 'text'"
        });
      }

      const uid = user_id || req.ip || "guest";
      const isQuoted = String(quoted) === "true";

      const d = new Date();
      const jam = d.toLocaleTimeString("en-US", { timeZone: "Asia/Jakarta" });
      const hari = d.toLocaleDateString('id', { weekday: 'long' });
      const tgl = d.toLocaleDateString('id', { day: 'numeric', month: 'long', year: 'numeric' });

      const logic = prompt || "";

      if (isQuoted && conversations[uid]) {
        conversations[uid] += `\nUser: ${text}`;
      } else {
        conversations[uid] = `User: ${text}`;
      }

      const start = Date.now();

      const ai = await chatWithAI(conversations[uid], logic);

      if (!ai) {
        return res.status(500).json({
          status: false,
          message: "AI na error euy, lieur meureun."
        });
      }

      conversations[uid] += `\n${ai}`;

      res.json({
        status: true,
        ms: Date.now() - start + 'ms',
        result: {
          user_id: uid,
          response: ai,
          metadata: {
            date: tgl,
            time: jam
          }
        }
      });

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      });
    }
  });

};