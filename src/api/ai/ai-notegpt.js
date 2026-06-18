const https = require('https');

module.exports = function (app) {

  const MODELS = [
    "gpt-4.1-mini",
    "gpt-4.1",
    "gpt-4o-mini",
    "gpt-4o",
    "claude-3-haiku",
    "claude-3-sonnet",
    "gemini-pro",
    "gemini-1.5-pro"
  ];

  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function generateCookie() {
    const anonId = generateId();
    const sbox = Buffer.from(`${Math.floor(Date.now()/1000)}|907803882`).toString('base64');
    const gid = `GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now()/1000)}`;
    const ga = `GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now()/1000 - 2592000)}`;

    return `anonymous_user_id=${anonId}; sbox-guid=${sbox}; _gid=${gid}; _ga=${ga}`;
  }

  function request(data) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(data);

      const options = {
        hostname: 'notegpt.io',
        path: '/api/v2/chat/stream',
        method: 'POST',
        headers: {
          'authority': 'notegpt.io',
          'accept': '*/*',
          'content-type': 'application/json',
          'origin': 'https://notegpt.io',
          'referer': 'https://notegpt.io/ai-chat',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'cookie': generateCookie(),
          'content-length': Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(body));
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  app.get('/ai/notegpt', async (req, res) => {
    try {
      const { text, model } = req.query;

      if (!text) {
        return res.status(400).json({
          status: false,
          message: "Falta parámetro 'text'"
        });
      }

      let selectedModel = model || "gpt-4.1-mini";

      // validar modelo
      if (!MODELS.includes(selectedModel)) {
        selectedModel = "gpt-4.1-mini"; // fallback
      }

      const payload = {
        message: text,
        language: "es",
        model: selectedModel,
        tone: 'default',
        length: 'moderate',
        conversation_id: generateId()
      };

      const raw = await request(payload);

      const lines = raw.split('\n');
      const texts = [];

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const json = JSON.parse(data);
            if (json.text) texts.push(json.text);
          } catch {}
        }
      }

      res.json({
        status: true,
        model: selectedModel,
        available_models: MODELS,
        result: texts.join('')
      });

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      });
    }
  });

};