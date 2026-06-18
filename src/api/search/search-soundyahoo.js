const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {

class YahooSoundCloudScraper {
    constructor() {
        this.baseUrl = 'https://id.search.yahoo.com/search';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
        };
    }

    _extractSoundCloudUrl(yahooUrl) {
        if (!yahooUrl) return null;
        const match = yahooUrl.match(/RU=([^/&]+)/);
        if (match && match[1]) {
            try {
                const decoded = decodeURIComponent(match[1]);
                return decoded.split('/RK=')[0];
            } catch {
                return yahooUrl;
            }
        }
        return yahooUrl;
    }

    _determineType(url) {
        if (!url) return 'unknown';
        return url.includes('/sets/') ? 'playlist' : 'track';
    }

    _cleanTitle(rawTitle) {
        if (!rawTitle) return '';
        const parts = rawTitle.split(' - SoundCloud');
        let title = parts[0];

        if (title.includes('https://')) {
            const cleanParts = title.split(/\s+/);
            title = cleanParts
                .filter(p => !p.includes('http') && !p.includes('›') && p.toLowerCase() !== 'soundcloud')
                .join(' ');
        }

        return title.trim();
    }

    _extractYear(text) {
        const match = text.match(/\b(20\d{2})\b/);
        return match ? match[1] : null;
    }

    async search(query, offset = 1) {
        try {
            const params = {
                p: `site://soundcloud.com ${query}`,
                b: offset,
                ei: 'UTF-8',
                nojs: '1'
            };

            const response = await axios.get(this.baseUrl, {
                params,
                headers: this.headers
            });

            const $ = cheerio.load(response.data);
            const finalData = [];

            $('section.algo-sr').each((i, el) => {

                const anchor = $(el).find('.compTitle a');
                const rawUrl = anchor.attr('href');
                const scUrl = this._extractSoundCloudUrl(rawUrl);

                if (!scUrl || !scUrl.includes('soundcloud.com')) return;

                const rawTitle = anchor.text().trim();
                const cleanTitle = this._cleanTitle(rawTitle);

                const descRaw = $(el).find('.s-desc').text().trim();

                finalData.push({
                    title: cleanTitle,
                    url: scUrl,
                    type: this._determineType(scUrl),
                    description: descRaw,
                    year: this._extractYear(descRaw),
                    position: i + 1
                });

            });

            return finalData;

        } catch (error) {
            throw new Error(error.message);
        }
    }
}

app.get('/search/yahoo-soundcloud', async (req, res) => {
    try {
        const { q, limit = 10, page = 2 } = req.query

        if (!q) {
            return res.json({
                status: false,
                error: 'Falta ?q='
            })
        }

        const scraper = new YahooSoundCloudScraper()
        const offset = (page - 1) * 10 + 1

        const data = await scraper.search(q, offset)

        res.json({
            status: true,
            query: q,
            total: data.length,
            results: data.slice(0, limit)
        })

    } catch (err) {

        console.error("SOUNDCLOUD SEARCH ERROR:", err)

        res.json({
            status: false,
            error: err.message
        })
    }
})

}