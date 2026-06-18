const axios = require('axios');
const https = require('https');
const FormData = require('form-data');

const agent = new https.Agent({ rejectUnauthorized: false });

async function uploadToCatbox(buffer, filename) {
  try {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, { filename, contentType: 'audio/mpeg' });

    const res = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
      httpsAgent: agent
    });

    return res.data;
  } catch {
    return null;
  }
}

async function getVideoData(query) {
  try {
    const { data } = await axios.get('https://www.youtube.com/results', {
      params: { search_query: query },
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const match = data.match(/var ytInitialData = (.*?);<\/script>/s);
    if (!match) return null;

    const contents = JSON.parse(match[1])
      ?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;

    const section = contents?.find(c => c.itemSectionRenderer)?.itemSectionRenderer?.contents;
    const video = section?.find(i => i.videoRenderer)?.videoRenderer;
    if (!video) return null;

    return {
      title: video.title?.runs?.[0]?.text || 'Unknown',
      url: `https://youtu.be/${video.videoId}`,
      thumbnail: video.thumbnail?.thumbnails?.slice(-1)[0]?.url,
      duration: video.lengthText?.simpleText || '0:00',
      author: video.ownerText?.runs?.[0]?.text || ''
    };
  } catch {
    return null;
  }
}

async function getDownloadData(youtubeUrl, format = 'mp3', quality = null) {
  try {
    const videoId = youtubeUrl.match(/(?:v=|\/shorts\/|\/)([0-9A-Za-z_-]{11})/)?.[1];
    if (!videoId) throw new Error('Invalid YouTube URL');

    const h = {
      'Accept': '*/*',
      'Origin': 'https://iframe.y2meta-uk.com',
      'Referer': 'https://iframe.y2meta-uk.com/',
      'User-Agent': 'Mozilla/5.0'
    };

    const keyRes = await axios.get('https://cnv.cx/v2/sanity/key', { headers: h });
    const key = keyRes.data.key;

    const audioBitrate = format === 'mp3' ? quality || '320' : '128';
    const videoQuality = format === 'mp4' ? quality || '720' : '720';

    const p = new URLSearchParams({
      link: `https://youtu.be/${videoId}`,
      format,
      audioBitrate,
      videoQuality,
      filenameStyle: 'pretty',
      vCodec: 'h264'
    });

    let res = await axios.post('https://cnv.cx/v2/converter', p.toString(), {
      headers: { ...h, 'Content-Type': 'application/x-www-form-urlencoded', key }
    });

    // Espera hasta que cnv.cx genere el link
    while (!res.data.downloadLink && !res.data.link && !res.data.error && res.data.id) {
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await axios.post(
        'https://cnv.cx/v2/converter/status',
        new URLSearchParams({ id: res.data.id }).toString(),
        { headers: { ...h, 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      res = statusRes;
    }

    return res.data.downloadLink || res.data.link || res.data.url || null;
  } catch {
    return null;
  }
}

module.exports = function(app) {
  app.get('/download/ytdl', async (req, res) => {
    try {
      const { q, format = 'mp3', quality = null } = req.query;
      if (!q) return res.status(400).json({ status: false, result: { error: 'Falta el parámetro q' } });

      const video = await getVideoData(q);
      if (!video) return res.status(404).json({ status: false, result: { error: 'Video no encontrado' } });

      const dl_url = await getDownloadData(video.url, format, quality);
      if (!dl_url) return res.status(500).json({ status: false, result: { error: 'No se pudo generar el enlace de descarga' } });

      res.json({
        status: true,
        result: {
          title: video.title,
          author: video.author,
          duration: video.duration,
          thumbnail: video.thumbnail,
          format,
          quality: quality || (format === 'mp3' ? '320' : '720'),
          dl_url
        }
      });
    } catch (err) {
      res.status(500).json({ status: false, result: { error: err.message } });
    }
  });
};