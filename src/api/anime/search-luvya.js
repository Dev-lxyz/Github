module.exports = function (app) {
    const axios = require('axios');
    async function searchManga(query) {
        const url = 'https://v4.luvyaa.co/wp-admin/admin-ajax.php';
        const params = new URLSearchParams();
        params.append('action', 'ts_ac_do_search');
        params.append('ts_ac_query', query);
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        };

        try {

            const { data } = await axios.post(
                url,
                params,
                { headers }
            );

            if (
                data &&
                data.series &&
                data.series[0] &&
                data.series[0].all
            ) {

                const results = data.series[0].all.map(item => ({
                    title: item.post_title,
                    type: item.post_type,
                    status: item.post_status,
                    latest: `${item.chapter_label}${item.post_latest}`,
                    genre: item.post_genres,
                    link: item.post_link
                }));

                return {
                    status: true,
                    total: results.length,
                    result: results
                };

            } else {

                return {
                    status: false,
                    result: []
                };

            }

        } catch (error) {

            return {
                status: false,
                error: error.message
            };

        }

    }

    app.get('/anime/search/luvya', async (req, res) => {
        try {
            const { q } = req.query;
            if (!q) {
                return res.json({
                    status: false,
                    error: 'Falta parametro ?q='
                });
            }

            const result = await searchManga(q);
            res.json(result);

        } catch (e) {

            res.json({
                status: false,
                error: e.message
            });

        }

    });

}