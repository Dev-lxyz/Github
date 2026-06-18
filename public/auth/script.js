const API = '' // si está en mismo dominio déjalo vacío

/* =========================
   REGISTER
========================= */
async function register(username, password, confirmPassword) {
  const res = await fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, confirmPassword })
  })

  return await res.json()
}

/* =========================
   LOGIN
========================= */
async function login(username, password) {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })

  const data = await res.json()

  if (data.status) {
    localStorage.setItem('user', JSON.stringify(data.result))
  }

  return data
}

/* =========================
   PERFIL (GET USER LOCAL)
========================= */
function getUser() {
  return JSON.parse(localStorage.getItem('user'))
}

/* =========================
   VERIFICAR AUTENTICACIÓN
========================= */
function checkAuth() {
  const user = getUser()
  if (!user) {
    location.href = '/login.html'
    return false
  }
  return true
}

/* =========================
   PROTEGER RUTAS
========================= */
function protectRoute() {
  const currentPath = window.location.pathname
  const user = getUser()

  const protectedRoutes = ['/docs', '/perfil', '/status']
  
  const isProtected = protectedRoutes.some(route => currentPath.includes(route))

  if (isProtected && !user) {
    location.href = '/login'
    return false
  }

  return true
}

// Ejecutar protección de rutas al cargar la página
window.addEventListener('load', protectRoute)

/* =========================
   CAMBIAR PASSWORD
========================= */
async function changePassword(username, newPassword) {
  const res = await fetch(`${API}/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, newPassword })
  })

  return await res.json()
}

/* =========================
   ACTUALIZAR PERFIL
========================= */
async function updateProfile(username, profileData) {
  const res = await fetch(`${API}/update-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, ...profileData })
  })

  const data = await res.json()

  if (data.status) {
    const user = getUser()
    if (user && user.username === username) {
      if (profileData.avatar) user.avatar = profileData.avatar
      if (profileData.apikey) user.apikey = profileData.apikey
      if (profileData.rateLimit) user.rateLimit = profileData.rateLimit
      if (data.result.stats) user.stats = data.result.stats
      localStorage.setItem('user', JSON.stringify(user))
    }
  }

  return data
}

/* =========================
   RESET API KEY
========================= */
async function resetKey(username) {
  const res = await fetch(`${API}/reset-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  })

  const data = await res.json()

  if (data.status) {
    const user = getUser()
    if (user && user.username === username) {
      user.apikey = data.result.apikey
      localStorage.setItem('user', JSON.stringify(user))
    }
  }

  return data
}

/* =========================
   DELETE ACCOUNT
========================= */
async function deleteAccount(username, password) {
  const res = await fetch(`${API}/delete-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })

  const data = await res.json()

  if (data.status) {
    localStorage.removeItem('user')
  }

  return data
}

/* =========================
   LOGOUT
========================= */
function logout() {
  localStorage.removeItem('user')
  location.href = '/login.html'
}