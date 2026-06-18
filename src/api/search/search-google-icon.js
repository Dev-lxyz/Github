module.exports = function (app) {

  const axios = require('axios')

  const mapping = {
    size: {
      large: 'isz:l',
      medium: 'isz:m',
      icon: 'isz:i',
      vga: 'isz:lt,islt:vga',
      svga: 'isz:lt,islt:svga',
      xga: 'isz:lt,islt:xga',
      '2mp': 'isz:lt,islt:2mp',
      '4mp': 'isz:lt,islt:4mp',
      '6mp': 'isz:lt,islt:6mp',
      '8mp': 'isz:lt,islt:8mp',
      '10mp': 'isz:lt,islt:10mp',
      '12mp': 'isz:lt,islt:12mp',
      '15mp': 'isz:lt,islt:15mp',
      '20mp': 'isz:lt,islt:20mp',
      '40mp': 'isz:lt,islt:40mp',
      '70mp': 'isz:lt,islt:70mp'
    },
    aspect: {
      tall: 'iar:t',
      square: 'iar:s',
      wide: 'iar:w',
      panoramic: 'iar:xw'
    },
    color: {
      color: 'ic:color',
      gray: 'ic:gray',
      trans: 'ic:trans'
    },
    type: {
      face: 'itp:face',
      photo: 'itp:photo',
      clipart: 'itp:clipart',
      lineart: 'itp:lineart',
      animated: 'itp:animated'
    },
    format: {
      jpg: 'ift:jpg',
      png: 'ift:png',
      gif: 'ift:gif',
      webp: 'ift:webp',
      svg: 'ift:svg',
      bmp: 'ift:bmp',
      ico: 'ift:ico',
      raw: 'ift:raw'
    },
    time: {
      hour: 'qdr:h',
      day: 'qdr:d',
      week: 'qdr:w',
      month: 'qdr:m',
      year: 'qdr:y'
    },
    rights: {
      cc: 'sur:cl',
      commercial: 'sur:ol'
    }
  }

  async function googleImageSearch(query, options = {}) {
    const tbsParts = []
    Object.keys(mapping).forEach(key => {
      if (options[key] && mapping[key][options[key]]) {
        tbsParts.push(mapping[key][options[key]])
      }
    })

    if (options.color === 'specific' && options.isc) {
      tbsParts.push(`ic:specific,isc:${options.isc}`)
    }

    const tbs = tbsParts.join(',')
    const fReq = JSON.stringify([[["HoAMBc", JSON.stringify([null, null, [1, null, 450, 1, 1440, [], [], [], null, null, null, 545, 100, []], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [query, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, tbs], null, null, null, null, null, null, null, null, ["", "", ""], null, false]), null, "generic"]]])

    try {
      const response = await axios.post('https://www.google.com/_/VisualFrontendUi/data/batchexecute?hl=en&rpcids=HoAMBc&safe=off', new URLSearchParams({
        'f.req': fReq
      }), {
        params: {
          'hl': 'id',
          'gl': 'ID',
          'rpcids': 'HoAMBc',
          ...(options.safe ? { 'safe': 'on' } : { 'safe': 'off' })
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        timeout: 15000
      })

      const pr = JSON.parse(response.data.slice(6))
      const rpcData = JSON.parse(pr[0][2])
      const items = rpcData[56]?.[1]?.[0]?.[0]?.[1]?.[0]
      if (!items) return []

      return items.map(item => {
        try {
          const innerObj = item[0]?.[0]
          if (!innerObj) return null
          const info = Object.values(innerObj)[0][1]
          return {
            title: info[9]?.["2003"]?.[3] || info[9]?.["2003"]?.[2],
            source: info[9]?.["2003"]?.[2] || info[9]?.["2003"]?.[3],
            image: info[3]?.[0],
            thumbnail: info[2]?.[0],
            width: info[3]?.[2],
            height: info[3]?.[1]
          }
        } catch (e) {
          return null
        }
      }).filter(x => x && x.image)
    } catch (err) {
      return []
    }
  }

  app.get('/search/google-image', async (req, res) => {
    try {
      const { q, size, aspect, color, type, format, time, rights, isc, safe, limit } = req.query

      if (!q) {
        return res.json({
          status: false,
          error: "Falta parametro ?q="
        })
      }

      const options = {
        size, aspect, color, type, format, time, rights, isc,
        safe: safe === 'true' || safe === '1'
      }

      const results = await googleImageSearch(q, options)
      const lim = Math.min(Math.max(parseInt(limit) || results.length, 1), 100)

      res.json({
        status: true,
        total: Math.min(results.length, lim),
        data: results.slice(0, lim)
      })

    } catch (err) {
      res.json({
        status: false,
        error: err.message
      })
    }
  })

  // Lista de filtros disponibles para usar como query params
  app.get('/search/google-images/filters', (req, res) => {
    res.json({
      status: true,
      data: mapping
    })
  })

}
