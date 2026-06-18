const axios = require('axios')

module.exports = function (app) {

  function formatDuration(ms) {
    if (!ms) return null
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  function formatDate(dateStr) {
    if (!dateStr) return null
    const d = new Date(dateStr)

    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()

    let hours = d.getHours()
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'

    hours = hours % 12
    hours = hours ? hours : 12

    return `${day}/${month}/${year} - ${hours}:${minutes} ${ampm}`
  }

  function formatNumber(num) {
    return Number(num || 0).toLocaleString('en-US')
  }

  app.get('/search/applemusic', async (req, res) => {
    try {
      const {
        q,
        limit = 10,
        country = 'US'
      } = req.query

      if (!q)
        return res.status(400).json({
          status: false,
          message: 'Falta el parámetro q (búsqueda)'
        })

      const { data } = await axios.get(
        'https://itunes.apple.com/search',
        {
          params: {
            term: q,
            media: 'music',
            entity: 'song',
            limit,
            country
          },
          timeout: 15000
        }
      )

      if (!data.results?.length)
        return res.json({
          status: false,
          message: 'No se encontraron resultados'
        })

      const results = data.results.map(r => ({
        title: r.trackName,
        artist: r.artistName,
        album: r.collectionName,
        genre: r.primaryGenreName,
        duration: formatDuration(r.trackTimeMillis),
        release_date: formatDate(r.releaseDate),
        price: r.trackPrice ? `$${r.trackPrice}` : null,
        currency: r.currency,
        track_number: r.trackNumber,
        disc_number: r.discNumber,
        explicit: r.trackExplicitness === 'explicit',
        country: r.country,

        cover: r.artworkUrl100
          ? r.artworkUrl100.replace('100x100', '1000x1000')
          : null,

        link: r.trackViewUrl
      }))

      res.json({
        status: true,
        query: q,
        total: results.length,
        country,
        results
      })

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      })
    }
  })

}