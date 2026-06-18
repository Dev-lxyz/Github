const axios = require("axios");

module.exports = function(app) {

  app.get("/tools/npm", async (req, res) => {
    try {
      const { text } = req.query;
      if (!text) return res.status(400).json({ status: false, message: "Falta el parámetro 'text' (nombre del paquete)" });

      const pkg = text.trim();

      const { data } = await axios.get(`https://registry.npmjs.org/${pkg}`, { timeout: 15000 });
      if (!data || !data['dist-tags'] || !data['dist-tags'].latest)
        return res.status(404).json({ status: false, message: "Paquete no encontrado" });

      const latestVersion = data['dist-tags'].latest;
      const info = data.versions[latestVersion] || {};

      const tgzUrl = info.dist?.tarball || null;

      const npmLink = `https://www.npmjs.com/package/${pkg}`;

      res.json({
        status: true,
        result: {
          name: info.name || pkg,
          version: latestVersion,
          description: info.description || null,
          homepage: info.homepage || null,
          license: info.license || null,
          author: info.author || null,
          repository: info.repository || null,
          keywords: info.keywords || [],
          dependencies: info.dependencies || {},
          devDependencies: info.devDependencies || {},
          tarball: tgzUrl,
          npm_link: npmLink
        },
        inspected_at: new Date().toISOString()
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      });
    }
  });

};