const axios = require('axios')

const NotoEmoji = {
    toUnicode: (input) => {
        let pairs = [];
        for (let i = 0; i < input.length; i++) {
            if (input.charCodeAt(i) >= 0xd800 && input.charCodeAt(i) <= 0xdbff) {
                if (input.charCodeAt(i + 1) >= 0xdc00 && input.charCodeAt(i + 1) <= 0xdfff) {
                    pairs.push((input.charCodeAt(i) - 0xd800) * 0x400 + (input.charCodeAt(i + 1) - 0xdc00) + 0x10000);
                    i++;
                }
            } else if (input.charCodeAt(i) < 0xd800 || input.charCodeAt(i) > 0xdfff) {
                pairs.push(input.charCodeAt(i));
            }
        }
        return pairs.map(val => val.toString(16)).join('_');
    },

    download: async (emoji) => {
        try {
            if (!emoji) return { status: 400, success: false, message: "Emojina mana mang?" };

            const unicode = NotoEmoji.toUnicode(emoji);
            const url = `https://fonts.gstatic.com/s/e/notoemoji/latest/${unicode}/512.webp`;

            const check = await axios.head(url).catch(() => null);
            if (!check) throw new Error("Emoji teu di-dukung atawa kode salah.");

            return {
                status: 200,
                success: true,
                result: {
                    emoji: emoji,
                    unicode: unicode,
                    url: url
                }
            };
        } catch (err) {
            return {
                status: 500,
                success: false,
                message: err.message
            };
        }
    }
};


module.exports = function(app) {

  app.get('/tools/emoji', async (req, res) => {
    const { emoji } = req.query

    if (!emoji) {
      return res.status(400).json({
        status: false,
        error: 'Falta parámetro ?emoji='
      })
    }

    try {
      const result = await NotoEmoji.download(emoji)

      res.status(result.status || 200).json(result)

    } catch (err) {
      res.status(500).json({
        status: false,
        error: 'Error Emoji Downloader',
        detail: err.message
      })
    }
  })

}