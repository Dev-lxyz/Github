const fetch = require('node-fetch')

const API_KEY = 'api-shadow'

module.exports = function (app) {

  app.get('/random/anime', async (req, res) => {
    try {
      const { name, key } = req.query

      if (!key) {
        return res.status(403).json({
          status: false,
          message: 'Falta el parámetro ?key='
        })
      }

      if (key !== API_KEY) {
        return res.status(403).json({
          status: false,
          message: 'Key inválida'
        })
      }

      const list = [
        'akira','akiyama','anna','asuna','ayuzawa','boruto','chitanda','chitoge','deidara','doraemon',
        'emilia','erza','gremory','hestia','hinata','inori','isuzu','itachi','itori','kaga','kagura',
        'kakasih','kaori','kaneki','kosaki','kotori','kuriyama','kuroha','kurumi','loli','madara',
        'mikasa','miku','minato','naruto','natsukawa','neko2','nekohime','nezuko','nishimiya',
        'onepiece','pokemon','rem','rize','sagiri','sakura','sasuke','shina','shinka','shizuka',
        'shota','tomori','toukachan','tsunade','yatogami','yuki'
      ]

      if (!name) {
        return res.status(400).json({
          status: false,
          message: 'Falta el parámetro ?name=',
          available: list
        })
      }

      const char = name.toLowerCase()

      if (!list.includes(char)) {
        return res.status(404).json({
          status: false,
          message: 'Personaje no encontrado',
          available: list
        })
      }

      const fileMap = {
        anna: 'ana',
        neko2: 'neko'
      }

      const fileName = fileMap[char] || char

      const url = `https://raw.githubusercontent.com/KazukoGans/database/main/anime/${fileName}.json`

      const response = await fetch(url)
      const data = await response.json()

      const random = data[Math.floor(Math.random() * data.length)]

      return res.json({
        status: true,
        character: char,
        result: random
      })

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message
      })
    }
  })

}