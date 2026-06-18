const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeAppleMusic(query, region = 'id') {
    const url = `https://music.apple.com/${region}/search?term=${encodeURIComponent(query)}`;

    try {
        const { data } = await axios.get(url, {
            timeout: 15000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
            }
        });

        const $ = cheerio.load(data);
        const results = [];

        $(".top-search-lockup, .shelf-grid__item").each((i, el) => {
            const title = $(el).find(".top-search-lockup__primary__title, .product-lockup__title").text().trim();
            const artist = $(el).find(".top-search-lockup__secondary, .product-lockup__subtitle").text().trim();
            const link = $(el).find("a.click-action, a.product-lockup__link").attr("href");
            const image = $(el).find("picture source").attr("srcset")?.split(" ")[0] 
                          || $(el).find("img").attr("src");

            if (title && artist && link) {
                results.push({
                    title,
                    artist,
                    link: link.startsWith("http") ? link : `https://music.apple.com${link}`,
                    image: image || null
                });
            }
        });

        return {
            status: true,
            data: results.slice(0, 10)
        };

    } catch (err) {
        return {
            status: false,
            error: err.message
        };
    }
}

module.exports = function(app) {

  app.get('/search/applemusic/v2', async (req, res) => {
    const { q, region = 'id', type = 'all' } = req.query;

    if (!q) {
      return res.status(400).json({
        status: false,
        error: 'Falta parámetro ?q='
      });
    }

    try {
      const result = await scrapeAppleMusic(q, region);

      if (!result.status) {
        return res.json(result);
      }

      let data = result.data;
      if (type !== 'all') {
        data = data.filter(item => {
          if (type === 'song') return item.link.includes('/song/');
          if (type === 'album') return item.link.includes('/album/');
          if (type === 'artist') return item.link.includes('/artist/');
          return true;
        });
      }

      res.json({
        status: true,
        creator: result.creator,
        total: data.length,
        result: data
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: 'Error Apple Music Search',
        detail: err.message
      });
    }
  });

};