const fetch = require('node-fetch');

module.exports = function(app) {

  app.get('/download/gdrive', async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          error: "Falta parámetro ?url="
        });
      }

      if (!url.match(/drive\.google\.com\/(file\/d\/|open\?id=|uc\?id=)/)) {
        return res.status(400).json({
          status: false,
          error: "URL inválida de Google Drive"
        });
      }

      const result = await gdriveScraper(url);

      if (!result.status) {
        return res.status(500).json({
          status: false,
          error: result.message || "No se pudo obtener el archivo"
        });
      }

      res.json({
        status: true,
        result: result.data
      });

    } catch (e) {
      res.status(500).json({
        status: false,
        error: "Error en Google Drive downloader",
        detail: e.message
      });
    }
  });

};


// 🔥 SCRAPER ORIGINAL (SIN CAMBIOS)
async function gdriveScraper(url) {
  try {
    let id = (url.match(/\/?id=(.+)/i) || url.match(/\/d\/(.*?)\//))[1]
    if (!id) throw new Error('No se encontró ID de descarga')
    let res = await fetch(`https://drive.google.com/uc?id=${id}&authuser=0&export=download`,
      { method: 'post', headers: { 'accept-encoding': 'gzip, deflate, br', 'content-length': 0, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', origin: 'https://drive.google.com', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36', 'x-client-data': 'CKG1yQEIkbbJAQiitskBCMS2yQEIqZ3KAQioo8oBGLeYygE=', 'x-drive-first-party': 'DriveWebUi', 'x-json-requested': 'true' }
      }
    )
    let { fileName, sizeBytes, downloadUrl } = JSON.parse((await res.text()).slice(4))
    if (!downloadUrl) throw new Error('Se excedió el número de descargas del link')
    let data = await fetch(downloadUrl)
    if (data.status !== 200) throw new Error(data.statusText)
    return {
      status: true,
      data: { fileName, fileSize: `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`, mimetype: data.headers.get('content-type'), downloadUrl }
    }
  } catch (error) {
    return { status: false, message: error.message }
  }
}