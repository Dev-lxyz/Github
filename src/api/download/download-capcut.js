module.exports = function (app) {
  const fetch = require("node-fetch");
  const cangcut = async (url) => {
    if (!url) throw new Error("Falta el parámetro ?url=");

    const body = new URLSearchParams({
      url,
      token: "153d8f770cb72578abab74c2e257fb85a1fd60dcb0330e32706763c90448ae01",
      hash: "aHR0cHM6Ly93d3cuY2FwY3V0LmNvbS90djIvWlNVQnVFVVBWLw==1037YXBp",
    });

    try {
      const r = await fetch("https://anydownloader.com/wp-json/api/download/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: "https://anydownloader.com",
          Referer:
            "https://anydownloader.com/en/online-capcut-video-downloader-without-watermark/",
          "User-Agent": "Mozilla/5.0",
        },
        body,
      });

      // verificar si el status es ok
      if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);

      const text = await r.text();

      // intentar parsear JSON
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("La respuesta no es JSON válida. Respuesta: " + text.slice(0, 200));
      }
    } catch (e) {
      throw new Error(e.message);
    }
  };

  app.get("/download/capcut", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ status: false, error: "Falta ?url=" });

      const result = await cangcut(url);

      res.status(200).json({
        status: true,
        result: result,
      });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
};