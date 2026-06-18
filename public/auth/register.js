(function () {
  // Inicializar iconos de Lucide
  lucide.createIcons()

  // ── Animación de flores en el fondo ──
  const colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#2563eb', '#1d4ed8']
  const body = document.body

  // Pétalos flotantes
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('div')
    el.className = 'petal'

    const size  = 14 + Math.random() * 30
    const color = colors[Math.floor(Math.random() * colors.length)]
    const dur   = 8 + Math.random() * 14
    const delay = Math.random() * 12
    const left  = Math.random() * 100

    el.innerHTML = `
      <svg width="${size}" height="${size}" viewBox="-20 -20 40 40" style="color:${color}">
        <use href="#flower5" color="${color}"/>
      </svg>`

    el.style.cssText = `
      left: ${left}%;
      bottom: -60px;
      animation-duration: ${dur}s;
      animation-delay: ${delay}s;
      z-index: 1;`

    body.appendChild(el)
  }

  // Flores estáticas que se balancean
  const positions = [
    { left: '5%',  top: '10%', size: 60, delay: 0   },
    { left: '88%', top: '8%',  size: 50, delay: 1.5 },
    { left: '2%',  top: '65%', size: 70, delay: 0.7 },
    { left: '92%', top: '60%', size: 55, delay: 2.2 },
    { left: '15%', top: '80%', size: 45, delay: 1   },
    { left: '80%', top: '78%', size: 65, delay: 0.3 },
    { left: '50%', top: '5%',  size: 40, delay: 1.8 },
    { left: '45%', top: '88%', size: 48, delay: 0.9 },
  ]

  positions.forEach(p => {
    const color = colors[Math.floor(Math.random() * colors.length)]
    const dur   = 3 + Math.random() * 3
    const el    = document.createElement('div')
    el.className = 'flower'

    el.style.cssText = `
      left: ${p.left};
      top: ${p.top};
      z-index: 1;
      animation-duration: ${dur}s;
      animation-delay: ${p.delay}s;`

    el.innerHTML = `
      <svg width="${p.size}" height="${p.size}" viewBox="-20 -20 40 40" style="opacity:0.35">
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

  // ── Sonido ──
  function playSound() {
    document.getElementById('successSound').play()
  }

  // ── Registro ──
  async function doRegister() {
    const btn             = document.getElementById('registerBtn')
    const username        = document.getElementById('username').value.trim()
    const password        = document.getElementById('password').value
    const confirmPassword = document.getElementById('confirmPassword').value

    if (!username || !password || !confirmPassword) {
      return showToast('Completa todos los campos', false)
    }

    // Deshabilitar botón mientras procesa
    btn.disabled = true
    btn.style.opacity = '0.7'

    try {
      const res = await register(username, password, confirmPassword)

      if (res.status) {
        playSound()
        showToast('✓ Cuenta creada con éxito', true)
        setTimeout(() => { location.href = '/login' }, 2000)
      } else {
        showToast(res.message || 'Registro fallido', false)
      }
    } catch (err) {
      showToast('Error de conexión', false)
    } finally {
      btn.disabled = false
      btn.style.opacity = '1'
    }
  }

  // ── Eventos ──
  document.getElementById('registerBtn').addEventListener('click', doRegister)

  // Enter en cualquier input también dispara el registro
  ;['username', 'password', 'confirmPassword'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') doRegister()
    })
  })
})()
