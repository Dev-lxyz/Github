const express = require('express')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const { changePassword, regenerateApiKey } = require('../../lib/apikey')

const usersPath = path.join(process.cwd(), 'database', 'users.json')

function loadUsers() {
  try {
    const data = JSON.parse(fs.readFileSync(usersPath, 'utf8'))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2))
}

function generateApiKey() {
  return 'YUME_' + crypto.randomBytes(8).toString('hex')
}

// Formatea stats con conteo real desde la DB
function formatStats(user) {
  const stats = user.stats || { limit: 1000, usos: 0, total: 0 }
  return {
    solicitudes: `${stats.usos || 0}/${stats.limit || 1000}`,
    limit: stats.limit || 1000,
    usos: stats.usos || 0,
    total: stats.total || 0
  }
}

// Formato unificado de respuesta de usuario
function formatUser(user) {
  return {
    username: user.username,
    apikey: user.apikey,
    rateLimit: user.rateLimit,
    avatar: user.avatar || '',
    banner: user.banner || '',
    stats: formatStats(user),
    createdAt: user.createdAt
  }
}

module.exports = function (app) {

  // REGISTER
  app.post('/register', async (req, res) => {
    try {
      const { username, password, confirmPassword } = req.body

      if (!username || !password || !confirmPassword) {
        return res.status(400).json({ status: false, message: 'Completa todos los campos' })
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ status: false, message: 'Las contraseñas no coinciden' })
      }

      const users = loadUsers()

      if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ status: false, message: 'El usuario ya existe' })
      }

      const newUser = {
        id: crypto.randomUUID(),
        username,
        password,
        apikey: generateApiKey(),
        enabled: true,
        rateLimit: '1000/day',
        createdAt: new Date().toISOString(),
        avatar: '',
        banner: '',
        stats: {
          solicitudes: '0/1000',
          limit: 1000,
          usos: 0,
          total: 0
        }
      }

      users.push(newUser)
      saveUsers(users)

      res.json({ status: true, result: formatUser(newUser) })

    } catch (e) {
      res.status(500).json({ status: false, message: e.message })
    }
  })

  // LOGIN
  app.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body

      if (!username || !password) {
        return res.status(400).json({ status: false, message: 'Completa todos los campos' })
      }

      const users = loadUsers()
      const user = users.find(
        u =>
          u.username.toLowerCase() === username.toLowerCase() &&
          u.password === password
      )

      if (!user) {
        return res.status(401).json({ status: false, message: 'Usuario o contraseña incorrectos' })
      }

      res.json({ status: true, result: formatUser(user) })

    } catch (e) {
      res.status(500).json({ status: false, message: e.message })
    }
  })

  // CAMBIAR PASSWORD
  app.post('/change-password', async (req, res) => {
    try {
      const { username, newPassword } = req.body

      if (!username || !newPassword) {
        return res.status(400).json({ status: false, message: 'Faltan parámetros' })
      }

      if (!changePassword(username, newPassword)) {
        return res.status(404).json({ status: false, message: 'Usuario no encontrado' })
      }

      res.json({ status: true, message: 'Contraseña actualizada' })

    } catch (e) {
      res.status(500).json({ status: false, message: e.message })
    }
  })

  // REGENERAR KEY
  app.post('/reset-key', async (req, res) => {
    try {
      const { username } = req.body

      if (!username) {
        return res.status(400).json({ status: false, message: 'Falta username' })
      }

      const newKey = generateApiKey()
      const result = regenerateApiKey(username, newKey)

      if (!result) {
        return res.status(404).json({ status: false, message: 'Usuario no encontrado' })
      }

      res.json({ status: true, result: { username, apikey: result } })

    } catch (e) {
      res.status(500).json({ status: false, message: e.message })
    }
  })

  // ACTUALIZAR PERFIL
  app.post('/update-profile', async (req, res) => {
    try {
      const { username, avatar, banner, apikey, rateLimit } = req.body

      if (!username) {
        return res.status(400).json({ status: false, message: 'Falta username' })
      }

      // Validar custom key si se manda
      if (apikey !== undefined) {
        if (apikey.length < 10 || /\s/.test(apikey)) {
          return res.status(400).json({
            status: false,
            message: 'La key debe tener al menos 10 caracteres y sin espacios'
          })
        }
      }

      const users = loadUsers()
      const userIndex = users.findIndex(
        u => u.username.toLowerCase() === username.toLowerCase()
      )

      if (userIndex === -1) {
        return res.status(404).json({ status: false, message: 'Usuario no encontrado' })
      }

      // Verificar que la key personalizada no esté en uso por otro
      if (apikey) {
        const keyTaken = users.find((u, i) => i !== userIndex && u.apikey === apikey)
        if (keyTaken) {
          return res.status(400).json({ status: false, message: 'Esa API key ya está en uso' })
        }
        users[userIndex].apikey = apikey
      }

      if (avatar !== undefined) users[userIndex].avatar = avatar
      if (banner !== undefined) users[userIndex].banner = banner

      if (rateLimit) {
        const limitNum = parseInt(rateLimit.split('/')[0])
        users[userIndex].rateLimit = rateLimit

        if (!users[userIndex].stats) {
          users[userIndex].stats = { usos: 0, total: 0 }
        }

        // Actualiza el límite sin resetear usos reales
        users[userIndex].stats.limit = limitNum
        users[userIndex].stats.solicitudes = `${users[userIndex].stats.usos || 0}/${limitNum}`
      }

      saveUsers(users)

      res.json({ status: true, result: formatUser(users[userIndex]) })

    } catch (e) {
      res.status(500).json({ status: false, message: e.message })
    }
  })

  // ELIMINAR CUENTA
  app.post('/delete-account', async (req, res) => {
    try {
      const { username, password } = req.body

      if (!username || !password) {
        return res.status(400).json({ status: false, message: 'Faltan parámetros' })
      }

      const users = loadUsers()
      const userIndex = users.findIndex(
        u =>
          u.username.toLowerCase() === username.toLowerCase() &&
          u.password === password
      )

      if (userIndex === -1) {
        return res.status(401).json({ status: false, message: 'Usuario o contraseña incorrectos' })
      }

      const deleted = users.splice(userIndex, 1)[0]
      saveUsers(users)

      res.json({
        status: true,
        message: 'Cuenta eliminada correctamente',
        result: { username: deleted.username }
      })

    } catch (e) {
      res.status(500).json({ status: false, message: e.message })
    }
  })

}
