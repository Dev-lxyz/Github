const axios = require('axios')

const headers = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'origin': 'https://aaplmusicdownloader.com',
  'referer': 'https://aaplmusicdownloader.com/',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-mode': 'cors',
  'accept-language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6'
}

async function aapldown(url, quality = '320') {

  const init = await axios.get('https://aaplmusicdownloader.com/', { headers })
  const cookies = init.headers['set-cookie']
  const cookieStr = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : ''

  const reqheaders = { ...headers, 'Cookie': cookieStr, 'x-requested-with': 'XMLHttpRequest' }

  const metadata = await axios.get(`https://aaplmusicdownloader.com/api/song_url.php?url=${encodeURIComponent(url)}`, { headers: reqheaders })
  const meta = metadata.data

  const swdData = new URLSearchParams()
  swdData.append('song_name', meta.name.replace(/['"]/g, ''))
  swdData.append('artist_name', meta.artist.replace(/['"]/g, ''))
  swdData.append('url', meta.url)
  swdData.append('token', 'none')
  swdData.append('zip_download', 'false')
  swdData.append('quality', quality)

  const swdRes = await axios.post('https://aaplmusicdownloader.com/api/composer/swd.php', swdData, {
    headers: { ...reqheaders, 'Content-Type': 'application/x-www-form-urlencoded' }
  })

  const id3Data = new URLSearchParams()
  id3Data.append('url', swdRes.data.dlink)
  id3Data.append('name', meta.name)
  id3Data.append('artist', meta.artist)
  id3Data.append('album', meta.albumname)
  id3Data.append('thumb', meta.thumb)

  const id3Res = await axios.post('https://aaplmusicdownloader.com/api/composer/ffmpeg/saveid3.php', id3Data, {
    headers: { ...reqheaders, 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'text'
  })

  return {
    title: meta.name,
    album: meta.albumname,
    artist: meta.artist,
    thumb: meta.thumb,
    duration: meta.duration,
    quality,
    url_dl: `https://aaplmusicdownloader.com/api/composer/ffmpeg/saved/${id3Res.data}`
  }
}

module.exports = function(app) {

  app.get('/download/applemusic/v2', async (req, res) => {
    const { url, quality = '320' } = req.query

    if (!url) {
      return res.status(400).json({
        status: false,
        error: 'Falta parámetro ?url='
      })
    }

    const allowed = ['64', '128', '192', '256', '320', 'm4a']
    if (!allowed.includes(quality)) {
      return res.status(400).json({
        status: false,
        error: `Calidad inválida. Usa: ${allowed.join(', ')}`
      })
    }

    try {
      const result = await aapldown(url, quality === 'm4a' ? 'original' : quality)

      res.json({
        status: true,
        result
      })

    } catch (err) {
      res.status(500).json({
        status: false,
        error: 'Error Apple Music',
        detail: err.message
      })
    }
  })

}