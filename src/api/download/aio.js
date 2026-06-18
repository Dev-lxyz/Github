module.exports = function (app) {
  const axios = require('axios');
  const { tmpdir } = require('os');
  const { join } = require('path');
  const { promises: fs } = require('fs');

  async function ddownr(url, format = '1080') {
    try {
      const downloadResponse = await axios({
        method: 'GET',
        url: 'https://p.savenow.to/ajax/download.php',
        params: {
          copyright: '0',
          format: format,
          url: url,
          api: 'dfcb6d76f2f6a9894gjkege8a4ab232222'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': '*/*',
          'Referer': 'https://ddownr.com/',
          'Origin': 'https://ddownr.com'
        }
      });

      const downloadId = downloadResponse.data.id || downloadResponse.data.download_id;
      const videoInfo = downloadResponse.data.info;

      if (!downloadId) throw new Error('No download ID received');

      let attempts = 0;
      const maxAttempts = 30;
      const pollInterval = 2000;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const progressResponse = await axios({
          method: 'GET',
          url: `https://p.savenow.to/api/progress`,
          params: { id: downloadId },
          headers: downloadResponse.config.headers
        });

        const data = progressResponse.data;

        if (data.success || data.download_url || data.status === 'finished') {
          return {
            title: videoInfo?.title || 'Unknown',
            thumbnail: videoInfo?.image || '',
            download_url: data.download_url,
            alternative_urls: data.alternative_download_urls || []
          };
        }

        if (data.error || data.status === 'error') {
          throw new Error(data.error || 'Failed to process');
        }

        attempts++;
      }

      throw new Error('Timeout: operation took too long');

    } catch (error) {
      throw error;
    }
  }

  app.get('/download/aio', async (req, res) => {
    try {
      const { url, format = '1080' } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          error: "Falta parámetro 'url'"
        });
      }

      const result = await ddownr(url, format);

      res.json({
        status: true,
        title: result.title,
        thumbnail: result.thumbnail,
        download_url: result.download_url,
        alternative_urls: result.alternative_urls
      });

    } catch (err) {
      console.error('[AIO-DOWNLOAD]', err.message);
      res.status(500).json({
        status: false,
        error: err.message
      });
    }
  });
};