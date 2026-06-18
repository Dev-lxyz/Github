(function () {
  // Inicializar iconos de Lucide
  lucide.createIcons()

  // ── Animación de flores en el fondo ──
  const colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#2563eb', '#1d4ed8']
  const body = document.body

  // Pétalos flotantes
  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div')
    el.className = 'petal'

    const size  = 14 + Math.random() * 28
    const color = colors[Math.floor(Math.random() * colors.length)]
    const dur   = 9 + Math.random() * 13
    const delay = Math.random() * 14

    el.innerHTML = `
      <svg width="${size}" height="${size}" viewBox="-20 -20 40 40">
        <use href="#flower5" color="${color}"/>
      </svg>`

    el.style.cssText = `
      left: ${Math.random() * 100}%;
      bottom: -60px;
      animation-duration: ${dur}s;
      animation-delay: ${delay}s;`

    body.appendChild(el)
  }

  // Flores estáticas que se balancean
  const spots = [
    { left: '4%',  top: '12%', size: 58, delay: 0   },
    { left: '87%', top: '7%',  size: 48, delay: 1.5 },
    { left: '3%',  top: '68%', size: 66, delay: 0.7 },
    { left: '91%', top: '62%', size: 52, delay: 2.2 },
    { left: '14%', top: '82%', size: 44, delay: 1   },
    { left: '82%', top: '80%', size: 62, delay: 0.3 },
    { left: '48%', top: '4%',  size: 38, delay: 1.8 },
    { left: '55%', top: '90%', size: 46, delay: 0.9 },
  ]

  spots.forEach(p => {
    const color = colors[Math.floor(Math.random() * colors.length)]
    const dur   = 3 + Math.random() * 3
    const el    = document.createElement('div')
    el.className = 'flower'

    el.style.cssText = `
      left: ${p.left};
      top: ${p.top};
      animation-duration: ${dur}s;
      animation-delay: ${p.delay}s;`

    el.innerHTML = `
      <svg width="${p.size}" height="${p.size}" viewBox="-20 -20 40 40" style="opacity:0.32">
        <use href="#flower5" color="${color}"/>
      </svg>`

    body.appendChild(el)
  })

  // ── Toast ──
  function showToast(msg, ok = true) {
    const toast = document.getElementById('toast')
    toast.innerHTML = `
      <i data-lucide="${ok ? 'check-circle' : 'alert-circle'}"
         style="color:${ok ? '#2563eb' : '#ef4444'};width:18px;height:18px;flex-shrink:0">
      </i> ${msg}`
    toast.style.borderLeftColor = ok ? 'var(--blue)' : '#ef4444'
    toast.style.display = 'flex'
    lucide.createIcons()
    setTimeout(() => { toast.style.display = 'none' }, 2800)
  }

  // ── Login ──
  async function doLogin() {
    const btn      = document.getElementById('loginBtn')
    const username = document.getElementById('username').value.trim()
    const password = document.getElementById('password').value

    if (!username || !password) {
      return showToast('Completa todos los campos', false)
    }

    // Deshabilitar botón mientras procesa
    btn.disabled = true
    btn.style.opacity = '0.7'

    try {
      const res = await login(username, password)

      if (res.status) {
        showToast('✓ ' + (res.message || 'Sesión iniciada'), true)
        setTimeout(() => { location.href = '/perfil' }, 1500)
      } else {
        showToast(res.message || 'Credenciales incorrectas', false)
      }
    } catch (err) {
      showToast('Error de conexión', false)
    } finally {
      btn.disabled = false
      btn.style.opacity = '1'
    }
  }

  // ── Eventos ──
  document.getElementById('loginBtn').addEventListener('click', doLogin)

  // Enter en cualquier input también dispara el login
  ;['username', 'password'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin()
    })
  })
})()
