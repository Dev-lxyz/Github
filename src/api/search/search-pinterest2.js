const axios = require('axios');

function tameText(txt, fallback = 'Unknown') {
  if (!txt || typeof txt !== 'string') return fallback;
  return txt.trim().replace(/\s+/g, ' ');
}

function formatNumber(num) {
  const n = Number(num);
  if (!n || isNaN(n)) return '0';
  return new Intl.NumberFormat('en-US').format(n);
}

function formatDate(value) {
  if (!value) return 'Unknown';
  if (!isNaN(value)) {
    let time = Number(value);
    if (time.toString().length === 10) time *= 1000;
    const d = new Date(time);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(d);
    }
  }
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(d);
  }
  return 'Unknown';
}

const headers = {
  'accept': 'application/json, text/javascript, */*; q=0.01',
  'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'priority': 'u=1, i',
  'referer': 'https://id.pinterest.com/',
  'screen-dpr': '1',
  'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133")',
  'sec-ch-ua-full-version-list':
    '"Not(A:Brand";v="99.0.0.0", "Google Chrome";v="133.0.6943.142", "Chromium";v="133.0.6943.142")',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-model': '""',
  'sec-ch-ua-platform': '"Windows"',
  'sec-ch-ua-platform-version': '"10.0.0"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'x-app-version': 'c056fb7',
  'x-pinterest-appstate': 'active',
  'x-pinterest-pws-handler': 'www/index.js',
  'x-pinterest-source-url': '/',
  'x-requested-with': 'XMLHttpRequest'
};

// Función para obtener estadísticas reales de un pin individual
async function getPinStats(pinId) {
  try {
    const url = `https://id.pinterest.com/resource/PinResource/get/?data=%7B%22options%22%3A%7B%22id%22%3A%22${pinId}%22%7D%2C%22context%22%3A%7B%7D%7D`;
    const { data } = await axios.get(url, { headers, timeout: 10000 });
    const pinData = data?.resource_response?.data || {};
    const stats = pinData.aggregated_pin_data?.aggregated_stats || {};
    return {
      likes: formatNumber(stats.likes ?? stats.saves ?? 0),
      shares: formatNumber(stats.shares ?? 0),
      comments: formatNumber(stats.comments ?? 0)
    };
  } catch (err) {
    return { likes: '0', shares: '0', comments: '0' };
  }
}

module.exports = function (app) {
  app.get('/search/pinterest/v2', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ status: false, message: "Missing parameter 'q'" });

      const searchLink = `https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(q)}%26rs%3Dtyped&data=%7B%22options%22%3A%7B%22applied_unified_filters%22%3Anull%2C%22appliedProductFilters%22%3A%22---%22%2C%22article%22%3Anull%2C%22auto_correction_disabled%22%3Afalse%2C%22corpus%22%3Anull%2C%22customized_rerank_type%22%3Anull%2C%22domains%22%3Anull%2C%22dynamicPageSizeExpGroup%22%3A%22control%22%2C%22filters%22%3Anull%2C%22journey_depth%22%3Anull%2C%22page_size%22%3Anull%2C%22price_max%22%3Anull%2C%22price_min%22%3Anull%2C%22query_pin_sigs%22%3Anull%2C%22query%22%3A%22${encodeURIComponent(q)}%22%2C%22redux_normalize_feed%22%3Atrue%2C%22request_params%22%3Anull%2C%22rs%22%3A%22typed%22%2C%22scope%22%3A%22pins%22%2C%22selected_one_bar_modules%22%3Anull%2C%22seoDrawerEnabled%22%3Afalse%2C%22source_id%22%3Anull%2C%22source_module_id%22%3Anull%2C%22source_url%22%3A%22%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(q)}%26rs%3Dtyped%22%2C%22top_pin_id%22%3Anull%2C%22top_pin_ids%22%3Anull%7D%2C%22context%22%3A%7B%7D%7D`;

      const { data } = await axios.get(searchLink, { headers, timeout: 10000 });
      const results = data?.resource_response?.data?.results || [];

      const pins = await Promise.all(
        results
          .filter(v => v.images?.orig?.url)
          .slice(0, 15)
          .map(async v => {
            const stats = await getPinStats(v.id);
            return {
              title: tameText(v.title || v.grid_title),
              description: tameText(v.description, 'No description'),
              author: tameText(v.pinner?.full_name, 'Unknown'),
              username: tameText(v.pinner?.username, 'Unknown'),
              author_profile: v.pinner?.username ? `https://www.pinterest.com/${v.pinner.username}/` : null,
              followers: formatNumber(v.pinner?.follower_count),
              likes: stats.likes,
              shares: stats.shares,
              comments: stats.comments,
              date: formatDate(v.created_at ?? v.creation_date ?? v.aggregated_pin_data?.created_at),
              size: v.images?.orig?.width && v.images?.orig?.height ? `${v.images.orig.width}x${v.images.orig.height}` : 'Unknown',
              download: v.images.orig.url,
              link: v?.link || (v?.id ? `https://www.pinterest.com/pin/${v.id}/` : null)
            };
          })
      );

      res.json({ status: true, count: pins.length, result: pins });
    } catch (e) {
      res.status(500).json({ status: false, message: 'Pinterest request failed', error: e.message });
    }
  });
};