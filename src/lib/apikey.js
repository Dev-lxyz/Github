const fs = require('fs')
const path = require('path')

const settingsPath = path.join(process.cwd(), 'src', 'settings.json')
const usersPath = path.join(process.cwd(), 'database', 'users.json')

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
  } catch {
    return null
  }
}

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

const rateLimitMap = new Map()

function parseRateLimit(rateLimitString) {
  if (!rateLimitString || rateLimitString === 'unlimited') {
    return { maxRequests: Infinity, windowMs: 0 }
  }

  const match = rateLimitString.match(/^(\d+)\/(minute|hour|day)$/)

  if (!match) {
    return { maxRequests: 1000, windowMs: 24 * 60 * 60 * 1000 }
  }

  const [, maxRequests, unit] = match

  let windowMs

  switch (unit) {
    case 'minute': windowMs = 60 * 1000; break
    case 'hour':   windowMs = 60 * 60 * 1000; break
    case 'day':    windowMs = 24 * 60 * 60 * 1000; break
    default:       windowMs = 24 * 60 * 60 * 1000
  }

  return { maxRequests: parseInt(maxRequests), windowMs }
}

function generateApiKey() {
  const crypto = require('crypto')
  return 'YUME_' + crypto.randomBytes(8).toString('hex')
}

function getUserByApiKey(key) {
  const users = loadUsers()
  return users.find(user => user.apikey === key)
}

function checkRateLimit(user, userIp) {
  if (!user) return false

  const rateLimit = user.rateLimit || '1000/day'

  if (rateLimit === 'unlimited') return true

  const { maxRequests, windowMs } = parseRateLimit(rateLimit)
  const now = Date.now()
  const mapKey = `${userIp}_${Math.floor(now / windowMs)}`

  if (!rateLimitMap.has(mapKey)) {
    rateLimitMap.set(mapKey, { count: 0, resetTime: now + windowMs })
  }

  const limitData = rateLimitMap.get(mapKey)

  if (now > limitData.resetTime) {
    limitData.count = 0
    limitData.resetTime = now + windowMs
  }

  if (limitData.count >= maxRequests) return false

  limitData.count++

  // Actualizar stats.usos en la DB
  const users = loadUsers()
  const index = users.findIndex(u => u.apikey === user.apikey)

  if (index !== -1) {
    if (!users[index].stats) {
      users[index].stats = { limit: maxRequests, usos: 0, total: 0 }
    }

    users[index].stats.usos = limitData.count
    users[index].stats.total = (users[index].stats.total || 0) + 1
    users[index].stats.solicitudes = `${limitData.count}/${maxRequests}`
    saveUsers(users)
  }

  return true
}

function validateApiKey(req, res, next) {
  const { key } = req.query

  if (!key) {
    return res.status(401).json({
      status: false,
      error: 'API key required',
      message: 'Please provide key parameter /login, /perfil'
    })
  }

  const user = getUserByApiKey(key)

  if (!user) {
    return res.status(403).json({
      status: false,
      error: 'Invalid API key',
      message: 'API key not found'
    })
  }

  if (user.enabled === false) {
    return res.status(403).json({
      status: false,
      error: 'API key disabled',
      message: 'This API key is disabled'
    })
  }

  const userIp = req.ip || req.connection.remoteAddress

  if (!checkRateLimit(user, userIp)) {
    return res.status(429).json({
      status: false,
      error: 'Rate limit exceeded',
      message: `Limit: ${user.rateLimit || '1000/day'}`
    })
  }

  req.user = user

  next()
}

function createApiKeyMiddleware() {
  return (req, res, next) => {
    const settings = loadSettings()

    if (!settings || !settings.apiSettings) return next()
    if (settings.apiSettings.requireApikey === false) return next()

    return validateApiKey(req, res, next)
  }
}

function changePassword(username, newPassword) {
  const users = loadUsers()
  const index = users.findIndex(
    user => user.username.toLowerCase() === username.toLowerCase()
  )

  if (index === -1) return false

  users[index].password = newPassword
  saveUsers(users)

  return true
}

// FIX: ahora acepta newKey opcional en lugar de siempre generar una
function regenerateApiKey(username, newKey) {
  const users = loadUsers()
  const index = users.findIndex(
    user => user.username.toLowerCase() === username.toLowerCase()
  )

  if (index === -1) return false

  users[index].apikey = newKey || generateApiKey()
  saveUsers(users)

  return users[index].apikey
}

// FIX: agrega soporte para banner
function updateProfile(username, profileData) {
  const users = loadUsers()
  const index = users.findIndex(
    user => user.username.toLowerCase() === username.toLowerCase()
  )

  if (index === -1) return false

  if (profileData.avatar !== undefined) users[index].avatar = profileData.avatar
  if (profileData.banner !== undefined) users[index].banner = profileData.banner
  if (profileData.apikey)    users[index].apikey = profileData.apikey
  if (profileData.rateLimit) users[index].rateLimit = profileData.rateLimit

  saveUsers(users)

  return users[index]
}

module.exports = {
  validateApiKey,
  createApiKeyMiddleware,
  changePassword,
  regenerateApiKey,
  updateProfile,
  generateApiKey,
  loadUsers,
  saveUsers
}
