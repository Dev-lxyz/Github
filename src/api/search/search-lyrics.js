const axios = require('axios')

module.exports = function (app) {

  app.get('/search/lyrics', async (req, res) => {
    try {
      const { q } = req.query

      if (!q)
        return res.status(400).json({
          status: false,
          message: 'Falta el parámetro q (canción o artista)'
        })

      const itunes = await axios.get(
        'https://itunes.apple.com/search',
        {
          params: {
            term: q,
            media: 'music',
            entity: 'song',
            limit: 1
          },
          timeout: 15000
        }
      )

      if (!itunes.data.results?.length)
        return res.json({
          status: false,
          message: 'Canción no encontrada'
        })

      const song = itunes.data.results[0]

      let lyrics = null
      try {
        const lyr = await axios.get(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(song.artistName)}/${encodeURIComponent(song.trackName)}`,
          { timeout: 15000 }
        )
        lyrics = lyr.data?.lyrics || null
      } catch {}

      res.json({
        status: true,
        result: {
          title: song.trackName,
          artist: song.artistName,
          album: song.collectionName,
          duration: Math.floor(song.trackTimeMillis / 1000),
          release_date: song.releaseDate,
          genre: song.primaryGenreName,
          explicit: song.trackExplicitness === 'explicit',

          cover: song.artworkUrl100
            ? song.artworkUrl100.replace('100x100', '600x600')
            : null,

          preview: song.previewUrl,
          apple_music_url: song.trackViewUrl,
          lyrics
        }
      })

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      })
    }
  })

}