(function () {
  lucide.createIcons()

  // ── Flores de fondo ──
  const colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#2563eb', '#1d4ed8']
  const body = document.body

  for (let i = 0; i < 16; i++) {
    const el = document.createElement('div')
    el.className = 'petal'
    const size  = 12 + Math.random() * 24
    const color = colors[Math.floor(Math.random() * colors.length)]
    el.innerHTML = `<svg width="${size}" height="${size}" viewBox="-20 -20 40 40"><use href="#flower5" color="${color}"/></svg>`
    el.style.cssText = `left:${Math.random()*100}%;bottom:-60px;animation-duration:${10+Math.random()*14}s;animation-delay:${Math.random()*16}s;`
    body.appendChild(el)
  }

  const spots = [
    {left:'4%',top:'8%',size:55,delay:0},{left:'89%',top:'6%',size:45,delay:1.5},
    {left:'2%',top:'55%',size:60,delay:0.7},{left:'93%',top:'55%',size:50,delay:2},
    {left:'10%',top:'88%',size:40,delay:1},{left:'85%',top:'85%',size:58,delay:0.4},
  ]

  spots.forEach(p => {
    const color = colors[Math.floor(Math.random() * colors.length)]
    const el = document.createElement('div')
    el.className = 'flower'
    el.style.cssText = `left:${p.left};top:${p.top};animation-duration:${3+Math.random()*3}s;animation-delay:${p.delay}s;`
    el.innerHTML = `<svg width="${p.size}" height="${p.size}" viewBox="-20 -20 40 40" style="opacity:0.3"><use href="#flower5" color="${color}"/></svg>`
    body.appendChild(el)
  })

  // ── Toast ──
  function showToast(msg, ok = true) {
    const toast = document.getElementById('toast')
    toast.innerHTML = `
      <i data-lucide="${ok ? 'check-circle' : 'alert-circle'}"
         style="color:${ok ? '#2563eb' : '#ef4444'};width:18px;height:18px;flex-shrink:0">
      </i> ${msg}`
    toast.style.borderLeftColor = ok ? '#2563eb' : '#ef4444'
    toast.classList.add('show')
    lucide.createIcons()
    setTimeout(() => toast.classList.remove('show'), 2800)
  }

  // ── Cargar datos del usuario ──
  let user = getUser()

  if (!user) {
    location.href = '/login'
    return
  }

  function renderUser() {
    user = getUser() || user

    // Nombre y rate
    document.getElementById('displayUsername').textContent = user.username || '—'
    document.getElementById('displayRateLimit').textContent = user.rateLimit || '1000/day'

    // Stats
    const stats = user.stats || { usos: 0, limit: 1000, total: 0 }
    document.getElementById('statUsos').textContent  = stats.usos  ?? 0
    document.getElementById('statLimit').textContent = stats.limit ?? 1000
    document.getElementById('statTotal').textContent = stats.total ?? 0

    // Avatar
    if (user.avatar) {
      document.getElementById('avatarImg').src = user.avatar
      document.getElementById('avatarImg').style.display = 'block'
      document.getElementById('avatarPlaceholder').style.display = 'none'
      document.getElementById('avatarInput').value = user.avatar
    } else {
      document.getElementById('avatarPlaceholder').textContent =
        (user.username || '?')[0].toUpperCase()
    }

    // Banner
    if (user.banner) {
      const bannerImg = document.getElementById('bannerImg')
      bannerImg.src = user.banner
      bannerImg.style.display = 'block'
      document.getElementById('bannerInput').value = user.banner
    }

    // API key
    document.getElementById('apikeyDisplay').value = user.apikey || ''
  }

  renderUser()

  // ── Toggle mostrar/ocultar key ──
  let keyVisible = false
  document.getElementById('toggleKeyBtn').addEventListener('click', () => {
    keyVisible = !keyVisible
    const input = document.getElementById('apikeyDisplay')
    input.type = keyVisible ? 'text' : 'password'
    const btn = document.getElementById('toggleKeyBtn')
    btn.innerHTML = `<i data-lucide="${keyVisible ? 'eye-off' : 'eye'}"></i>`
    lucide.createIcons()
  })

  // ── Copiar key ──
  document.getElementById('copyKeyBtn').addEventListener('click', async () => {
    const key = document.getElementById('apikeyDisplay').value
    if (!key) return
    try {
      await navigator.clipboard.writeText(key)
      showToast('Key copiada al portapapeles', true)
    } catch {
      showToast('No se pudo copiar', false)
    }
  })

  // ── Guardar key personalizada ──
  document.getElementById('saveKeyBtn').addEventListener('click', async () => {
    const btn       = document.getElementById('saveKeyBtn')
    const customKey = document.getElementById('customKey').value.trim()

    if (!customKey) return showToast('Escribe una key personalizada', false)
    if (customKey.length < 10) return showToast('Mínimo 10 caracteres', false)
    if (/\s/.test(customKey)) return showToast('Sin espacios', false)

    btn.disabled = true
    btn.style.opacity = '0.7'

    try {
      const res = await updateProfile(user.username, { apikey: customKey })
      if (res.status) {
        document.getElementById('customKey').value = ''
        renderUser()
        showToast('Key actualizada', true)
      } else {
        showToast(res.message || 'Error al guardar', false)
      }
    } catch {
      showToast('Error de conexión', false)
    } finally {
      btn.disabled = false
      btn.style.opacity = '1'
    }
  })

  // ── Regenerar key aleatoria ──
  document.getElementById('resetKeyBtn').addEventListener('click', async () => {
    const btn = document.getElementById('resetKeyBtn')
    btn.disabled = true
    btn.style.opacity = '0.7'

    try {
      const res = await resetKey(user.username)
      if (res.status) {
        renderUser()
        showToast('Key regenerada', true)
      } else {
        showToast(res.message || 'Error', false)
      }
    } catch {
      showToast('Error de conexión', false)
    } finally {
      btn.disabled = false
      btn.style.opacity = '1'
    }
  })

  // ── Guardar perfil (avatar + banner) ──
  document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const btn    = document.getElementById('saveProfileBtn')
    const avatar = document.getElementById('avatarInput').value.trim()
    const banner = document.getElementById('bannerInput').value.trim()

    if (!avatar && !banner) return showToast('No hay cambios', false)

    btn.disabled = true
    btn.style.opacity = '0.7'

    try {
      const payload = {}
      if (avatar) payload.avatar = avatar
      if (banner) payload.banner = banner

      const res = await updateProfile(user.username, payload)

      if (res.status) {
        renderUser()
        showToast('Perfil actualizado', true)
      } else {
        showToast(res.message || 'Error al guardar', false)
      }
    } catch {
      showToast('Error de conexión', false)
    } finally {
      btn.disabled = false
      btn.style.opacity = '1'
    }
  })

  // ── Preview avatar al escribir URL ──
  document.getElementById('avatarInput').addEventListener('input', e => {
    const url = e.target.value.trim()
    if (!url) return
    const img = document.getElementById('avatarImg')
    img.src = url
    img.style.display = 'block'
    document.getElementById('avatarPlaceholder').style.display = 'none'
    img.onerror = () => {
      img.style.display = 'none'
      document.getElementById('avatarPlaceholder').style.display = 'flex'
    }
  })

  // ── Preview banner al escribir URL ──
  document.getElementById('bannerInput').addEventListener('input', e => {
    const url = e.target.value.trim()
    const bannerImg = document.getElementById('bannerImg')
    if (!url) {
      bannerImg.style.display = 'none'
      return
    }
    bannerImg.src = url
    bannerImg.style.display = 'block'
    bannerImg.onerror = () => { bannerImg.style.display = 'none' }
  })

  // ── Click en banner para ir al campo ──
  document.getElementById('bannerWrap').addEventListener('click', () => {
    document.getElementById('bannerInput').focus()
    document.getElementById('bannerInput').scrollIntoView({ behavior: 'smooth', block: 'center' })
  })

  // ── Click en avatar para ir al campo ──
  document.getElementById('avatarWrap').addEventListener('click', () => {
    document.getElementById('avatarInput').focus()
    document.getElementById('avatarInput').scrollIntoView({ behavior: 'smooth', block: 'center' })
  })

  // ── Cambiar contraseña ──
  document.getElementById('savePasswordBtn').addEventListener('click', async () => {
    const btn             = document.getElementById('savePasswordBtn')
    const newPassword     = document.getElementById('newPassword').value
    const confirmPassword = document.getElementById('confirmNewPassword').value

    if (!newPassword || !confirmPassword) return showToast('Completa los campos', false)
    if (newPassword !== confirmPassword) return showToast('Las contraseñas no coinciden', false)
    if (newPassword.length < 6) return showToast('Mínimo 6 caracteres', false)

    btn.disabled = true
    btn.style.opacity = '0.7'

    try {
      const res = await changePassword(user.username, newPassword)
      if (res.status) {
        document.getElementById('newPassword').value = ''
        document.getElementById('confirmNewPassword').value = ''
        showToast('Contraseña actualizada', true)
      } else {
        showToast(res.message || 'Error', false)
      }
    } catch {
      showToast('Error de conexión', false)
    } finally {
      btn.disabled = false
      btn.style.opacity = '1'
    }
  })

  // ── Logout ──
  document.getElementById('logoutBtn').addEventListener('click', () => {
    logout()
  })

  // ── Eliminar cuenta — abrir modal ──
  document.getElementById('deleteAccountBtn').addEventListener('click', () => {
    document.getElementById('deletePassword').value = ''
    document.getElementById('deleteModal').classList.add('show')
    lucide.createIcons()
  })

  document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
    document.getElementById('deleteModal').classList.remove('show')
  })

  // Cerrar modal al hacer click en el backdrop
  document.getElementById('deleteModal').addEventListener('click', e => {
    if (e.target === document.getElementById('deleteModal')) {
      document.getElementById('deleteModal').classList.remove('show')
    }
  })

  // ── Confirmar eliminación ──
  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    const btn      = document.getElementById('confirmDeleteBtn')
    const password = document.getElementById('deletePassword').value

    if (!password) return showToast('Ingresa tu contraseña', false)

    btn.disabled = true
    btn.textContent = 'Eliminando...'

    try {
      const res = await deleteAccount(user.username, password)
      if (res.status) {
        showToast('Cuenta eliminada', true)
        setTimeout(() => { location.href = '/register' }, 1500)
      } else {
        showToast(res.message || 'Error', false)
        btn.disabled = false
        btn.textContent = 'Eliminar'
      }
    } catch {
      showToast('Error de conexión', false)
      btn.disabled = false
      btn.textContent = 'Eliminar'
    }
  })

})()
