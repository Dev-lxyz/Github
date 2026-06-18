const axios = require('axios');

class TikTokPhotoSearch {
  constructor() {
    this.api = 'https://tikwm.com/api/photo/search';
    this.headers = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
  }

  /**
   * Buscar fotos en TikTok
   * @param {string} keywords - palabra clave
   * @param {number} cursor - offset/paginación
   */
  async search(keywords, cursor = 0) {
    try {
      const params = new URLSearchParams();
      params.append('keywords', keywords);
      params.append('count', 12);   // número de resultados por página
      params.append('cursor', cursor);
      params.append('web', 1);
      params.append('hd', 1);

      const response = await axios.post(this.api, params.toString(), {
        headers: this.headers
      });

      const res = response.data;
      if (res.code !== 0) throw new Error(res.msg || "TikWM server error");

      // Solo fotos
      const photos = res.data.videos
        .filter(v => v.images && v.images.length > 0)
        .map(v => ({
          id: v.video_id,
          title: v.title,
          region: v.region,
          author: {
            username: v.author.unique_id,
            nickname: v.author.nickname,
            avatar: `https://tikwm.com${v.author.avatar}`
          },
          images: v.images.map(img => `${img}`),
          stats: {
            like: v.digg_count,
            comment: v.comment_count,
            share: v.share_count
          }
        }));

      return {
        status: true,
        total: photos.length,
        next_cursor: res.data.cursor,
        results: photos
      };

    } catch (e) {
      return {
        status: false,
        error: e.message
      };
    }
  }
}

module.exports = function(app) {
  const tk = new TikTokPhotoSearch();

  app.get('/search/tiktok-photo', async (req, res) => {
    try {
      const { q, cursor = 0 } = req.query;
      if (!q) return res.json({ status: false, error: 'Falta query ?q=' });

      const data = await tk.search(q, parseInt(cursor));
      res.json(data);
    } catch (e) {
      res.status(500).json({ status: false, error: e.message });
    }
  });
};