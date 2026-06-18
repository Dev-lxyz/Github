const axios = require("axios");
const CryptoJS = require("crypto-js");

module.exports = function (app) {

  const mega = {

    decryptAttr: (enc, fileKey) => {
      try {
        const ab = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), 'base64');
        const kResult = ab(fileKey);

        const k = new Uint32Array(kResult.buffer);
        const key = new Uint32Array([
          k[0] ^ k[4],
          k[1] ^ k[5],
          k[2] ^ k[6],
          k[3] ^ k[7]
        ]);

        const keyWA = CryptoJS.lib.WordArray.create(new Uint8Array(key.buffer));
        const ivWA = CryptoJS.lib.WordArray.create(new Uint8Array(16));
        const cipherWA = CryptoJS.lib.WordArray.create(ab(enc));

        const decrypted = CryptoJS.AES.decrypt(
          { ciphertext: cipherWA },
          keyWA,
          { iv: ivWA, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.NoPadding }
        );

        const str = CryptoJS.enc.Utf8.stringify(decrypted);

        const start = str.indexOf('{"n"');
        const end = str.lastIndexOf('}');

        if (start === -1) throw new Error("JSON no encontrado");

        return JSON.parse(str.substring(start, end + 1));
      } catch (e) {
        return { n: "Unknown File" };
      }
    },

    formatSize: (bytes) => {
      if (!bytes) return "0 B";
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
    },
    fetch: async (url) => {
      const fileId = url.match(/file\/([a-zA-Z0-9_-]+)/)?.[1];
      const fileKey = url.split('#')[1];

      if (!fileId || !fileKey) {
        throw new Error("URL Mega inválida");
      }

      const { data } = await axios.post(
        "https://g.api.mega.co.nz/cs",
        [{ a: "g", g: 1, p: fileId }],
        {
          headers: { "User-Agent": "Mozilla/5.0" },
          timeout: 10000
        }
      );

      if (!data || typeof data[0] === "number") {
        throw new Error("Error obteniendo datos de Mega");
      }

      const info = data[0];
      const attr = mega.decryptAttr(info.at, fileKey);

      const filename = attr.n || "Unknown File";

      return {
        status: true,
        result: {
          filename,
          extension: filename.includes('.') ? filename.split('.').pop() : null,
          size: info.s,
          size_formatted: mega.formatSize(info.s),
          download_url: info.g,
          file_id: fileId,
          file_key: fileKey
        }
      };
    }
  };

  app.get("/download/mega", async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.json({
          status: false,
          error: "Falta parámetro ?url="
        });
      }

      const data = await mega.fetch(url);

      res.json(data);

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      });
    }
  });

};