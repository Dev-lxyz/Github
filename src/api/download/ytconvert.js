module.exports = function (app) {

  /**
   * Ytconvert download mp4/mp3
   * base: https://ytconvert.org/
   * Creator: ShanMolvyr
   */
  const BASE = 'https://ytdl.y2mp3.co/api';
  const H = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36',
    'Referer': 'https://ytconvert.org/',
  };

  function extractId(url) {
    const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
    throw new Error('Invalid YouTube URL');
  }

  async function getInfo(url) {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!r.ok) throw new Error(`oEmbed ${r.status}`);
    const d = await r.json();
    return { title: d.title, author: d.author_name, thumbnail: d.thumbnail_url };
  }

  async function submit(url, type, format, quality) {
    const r = await fetch(`${BASE}/v2/download`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ url, output: { type, format, quality } }),
    });
    if (!r.ok) throw new Error(`Submit ${r.status}`);
    const d = await r.json();
    if (!d.statusUrl) throw new Error('No statusUrl');
    return d;
  }

  async function poll(statusUrl, interval = 3000, timeout = 120000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const r = await fetch(statusUrl, { headers: H });
      if (!r.ok) throw new Error(`Poll ${r.status}`);
      const d = await r.json();
      if (d.status === 'completed') return d;
      if (d.status === 'error' || d.status === 'failed') throw new Error(`Job ${d.status}`);
      await new Promise(res => setTimeout(res, interval));
    }
    throw new Error('Timeout');
  }

  async function run(url, format, quality) {
    const isAudio = format === 'mp3';
    const type = isAudio ? 'audio' : 'video';
    const q = quality || (isAudio ? '320' : '2160p');

    const [info, job] = await Promise.all([
      getInfo(url),
      submit(url, type, format, q),
    ]);

    const result = await poll(job.statusUrl);

    return {
      title: info.title,
      author: info.author,
      thumbnail: info.thumbnail,
      format,
      requested_quality: q,
      selected_quality: job.selectedQuality ?? result.selectedQuality,
      quality_changed: job.qualityChanged ?? false,
      quality_change_reason: job.qualityChangeReason ?? null,
      duration: result.duration,
      download_url: result.downloadUrl,
    };
  }

  app.get('/download/ytconvert', async (req, res) => {
    try {
      const { url, format, quality } = req.query

      if (!url) {
        return res.json({ status: false, error: 'Falta parametro ?url=' })
      }

      extractId(url) // valida que sea un link de YouTube valido, tira error si no

      const fmt = format || 'mp4'

      if (!['mp4', 'mp3'].includes(fmt)) {
        return res.json({ status: false, error: 'Format válido: mp4 | mp3' })
      }

      const result = await run(url, fmt, quality)

      res.json({ status: true, data: result })

    } catch (err) {
      res.json({ status: false, error: err.message })
    }
  })

}
