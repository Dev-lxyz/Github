const express = require('express')
const chalk = require('chalk')
const fs = require('fs')
const cors = require('cors')
const path = require('path')
const os = require('os')
const si = require('systeminformation')
const axios = require('axios')
const app = express()
const PORT = process.env.PORT || 3000

require('./clear.js')
const uploadDir = path.join(process.cwd(), "files")

// Crear carpeta files si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}

// Servir archivos estáticos
app.use("/files", express.static(uploadDir))

// ** ** *** *** ** ** *** *** ***
// EXPRESS SETTINGS
// ** ** *** *** ** ** *** *** ***

// https://fgsi.dpdns.org/api/proxy-fetch/:url....
app.enable("trust proxy")
app.set("json spaces", 2)
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors())

// Archivos estáticos
app.use('/', express.static(path.join(__dirname, 'public')))
app.use('/src', express.static(path.join(__dirname, 'src')))

// ** ** *** *** ** ** *** *** ***
// SETTINGS.JSON
// ** ** *** *** ** ** *** *** ***
const settingsPath = path.join(__dirname, './src/settings.json')
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))

// ** ** *** *** ** ** *** *** ***
// DATABASE JSON AUTOMÁTICO
// ** ** *** *** ** ** *** *** ***
const dbPath = path.join(__dirname, './src/database.json')

// Plantilla inicial
const initialDB = {
  total_requests: 0,
  users: {},
  endpoints: {}
}

let db

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify(initialDB, null, 2))
  db = initialDB
  console.log(chalk.green('✅ database.json creado automáticamente'))
} else {
  try {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
  } catch (err) {
    console.log(chalk.red('🍚 Error leyendo database.json, recreando...'))
    fs.writeFileSync(dbPath, JSON.stringify(initialDB, null, 2))
    db = initialDB
  }
}

function saveDB() {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))
}

// ** ** *** *** ** ** *** *** ***
// CONTADORES
// ** ** *** *** ** ** *** *** ***
let requestCount = db.total_requests || 0
const apiStartTime = Date.now()
const userRequests = db.users || {}
const endpointStats = db.endpoints || {}

// ** ** *** *** ** ** *** *** ***
// CACHE SISTEMA (5 segundos)
// ** ** *** *** ** ** *** *** ***
let systemCache = null
let cacheTTL = 5000 // 5 segundos
let lastCacheTime = 0

async function getSystemInfo() {
  const now = Date.now()
  
  // Si el cache es válido, devolverlo
  if (systemCache && (now - lastCacheTime) < cacheTTL) {
    return systemCache
  }

  // Cargar datos del sistema
  const [mem, cpu, cpuSpeed, cpuTemp, disk, osInfo, net, processes] = await Promise.all([
    si.mem(),
    si.cpu(),
    si.cpuCurrentSpeed(),
    si.cpuTemperature(),
    si.fsSize(),
    si.osInfo(),
    si.networkInterfaces(),
    si.processes()
  ])

  systemCache = {
    mem, cpu, cpuSpeed, cpuTemp, disk, osInfo, net, processes
  }
  lastCacheTime = now

  return systemCache
}

// ** ** *** *** ** ** *** *** ***
// FORMATEAR UPTIME
// ** ** *** *** ** ** *** *** ***
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400)
  seconds %= 86400
  const h = Math.floor(seconds / 3600)
  seconds %= 3600
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${d}D, ${h}H, ${m}M, ${s}S`
}

// ** ** *** *** ** ** *** *** ***
// CONSOLA BONITA INICIO (solo chalk)
// ** ** *** *** ** ** *** *** ***
console.log(chalk.magentaBright('\n❀ Iniciando API...\n'))
console.log(chalk.cyanBright('=============================='))
console.log(chalk.cyanBright('        YUME REST API         '))
console.log(chalk.cyanBright('==============================\n'))


console.log(chalk.hex('#FFB6C1')(`
             ⢀ ⡤⢤⣀⣤⣀⡀                    
       ⢀⣠⢾⠞⢩⣧⡨⠿⠿⢿⡝⠯⠛⠶⣄                 
     ⢀⣶⠟⠍⠁⢒⠿⡠⠖⠉⠉⢙⣷⠁  ⠈⠩⣲⣄              
    ⢤⡿⣥⡖⣲⣿⣿⣞⣁⣀⠴⢚⣿⠛⣷⡈⣆ ⠱⡌⠉⢧             
   ⢰⡿⢛⣶⣿⣿⣿⠋⣹⣟⣁⣴⣾⠃⢀⡏⠇⠸⡀ ⢱ ⢈⡇            
   ⣿⡇⡘⣾⣿⣿⡇⣸⡯⠽⠟⢋⣉⠑⡞⠈⡼⢠⢧  ⡇⠈⢿            
  ⠐⡿⢰⢁⡟ ⠉⣰⠙⡿⣷⣶⢦⡄⢰⠁⢰⠃⣸⡌ ⢸⠃⢀⢾            
   ⣷⢸⢸⢧⡰⢼⣿⡀⠉⠁⠈   ⢧⢇⣸⣳⠁⡰⢃ ⣸⣿⡄           
   ⢿⣿⡸⣼⡝⢦⠣⠁      ⠘⠙⠻⢥⠞⢁⠜⣰⣿⣿⡿           
   ⠈⢿⢿⣼⣇⠘⣧⡀     ⠄    ⣼⣧⣾⡷⠛⢿⠓           
    ⠸⠺⣿⣿⣇⣿⠙⢦⡀      ⢀⣼⡿⠋   ⠈            
  ⢀⡤⠶⠶⠿⢿⣿⡇  ⠈⠓⠤⣤⡤⠖⠊⠉                   
 ⡴⠋     ⠙⠓⠤⠄⣀⡀ ⢸⣷⣦⡤⠤⠖⠒⠒⠢⢤⡀             
⢸⠃     ⢀⢆⡀ ⠂⠒⠒⠒⠻⠦⣄⡀ ⢀⠢⠤⠤⢄⡹⣦⣀           
⡚      ⡸⠋     ⢀   ⠈⠳⡄     ⠈⠉⠳⣤⡀        
⢹     ⢠⠇      ⠻⠇    ⠙⡄       ⣾⣵⣄       
 ⣇    ⢸⡀             ⡇       ⠈ ⣿       
 ⠻⡄    ⢇            ⣠⣇         ⡿       
  ⣷    ⠈⡦⣀       ⣀⠠⠖⠋⠈⠳⣄      ⢠⡟       
  ⠹⡄    ⢸⠈⠉⠒⠒⠒⠊⠉⠁      ⠈⠳⣆⡀ ⢀⡴⠟        
   ⢥    ⢸⡆               ⠐⡿⠛⠉          
   ⢸⡄   ⢸⣧             ⢀  ⣧            
   ⠈⣷    ⡹⣿⡴⠋          ⠘  ⠛⢧⡀          
    ⣿⠄   ⣿⠋                 ⠱⣄         
    ⠭⠄  ⡰⠁                   ⠈⠻⡄       
    ⠸⡆ ⢰⠁                ⠠     ⠈⠻⡄       
     ⢻⣄⡎                         ⠢⡱⡄  ⠄
     ⠈⡿                        ⣀  ⠁⠙⡄  
     ⢸⠁         ⢀             ⢠⠃    ⠹⡄ 
    ⢀⡇           ⠑⢦⡀         ⢠⠏      ⠹ 
    ⢸              ⠈⠢⡀       ⡞        ⢳
    ⢸                ⠈⠢⡀ ⢹⡀ ⢀⡇        ⢸
    ⢸                  ⠹⡄ ⡇ ⢸        ⡀⢾
    ⠘⡆                  ⠘⡆⣇⣾⠏         ⡇
     ⢳                   ⢹⡏⠉         ⢀⡏
     ⠈⢧                   ⢳⡀        ⢀⡏
\n`))


// ** ** *** *** ** ** *** *** ***
// RATE LIMIT POR IP + GUARDADO
// ** ** *** *** ** ** *** *** ***

app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown'
  const currentDate = new Date().toISOString().split('T')[0]

  if (!userRequests[ip]) userRequests[ip] = {}
  if (userRequests[ip].date !== currentDate) {
    userRequests[ip].date = currentDate
    userRequests[ip].count = 0
  }

  if (userRequests[ip].count >= parseInt(settings.apiSettings.limit)) {
    return res.status(429).json({
      status: 429,
      creator: settings.apiSettings.creator,
      message: "Daily request limit reached"
    })
  }

  userRequests[ip].count++
  requestCount++
  db.total_requests = requestCount
  db.users = userRequests
  saveDB()
  next()
})

// ** ** *** *** ** ** *** *** ***
// LOGGER GLOBAL (POR REQUEST)
// ** ** *** *** ** ** *** *** ***
app.use((req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const ms = Date.now() - start
    const status = res.statusCode
    const method = req.method
    const path = req.originalUrl

    if (!endpointStats[path]) {
      endpointStats[path] = { count: 0, errors: 0, ms: 0, status: null }
    }

    endpointStats[path].count++
    endpointStats[path].ms = ms // último tiempo
    endpointStats[path].status = status // último status

    if (status >= 400) endpointStats[path].errors++

    db.endpoints = endpointStats
    saveDB()

    const color =
      status >= 500 ? chalk.red :
      status >= 400 ? chalk.yellow :
      chalk.green

    console.log(
      color(` ${method} `) +
      chalk.white(path) +
      ' ' +
      color(status) +
      chalk.gray(` - ${ms}ms`)
    )
  })

  next()
})

// ** ** *** *** ** ** *** *** ***
// INYECTAR CREATOR
// ** ** *** *** ** ** *** *** ***
app.use((req, res, next) => {
  const originalJson = res.json
  res.json = function (data) {
    if (data && typeof data === 'object') {
      return originalJson.call(this, {
        status: data.status,
        creator: settings.apiSettings.creator || "xd",
        ...data
      })
    }
    return originalJson.call(this, data)
  }
  next()
})

// ** ** *** *** ** ** *** *** ***
// CARGAR RUTAS DINÁMICAS
// ** ** *** *** ** ** *** *** ***
let totalRoutes = 0
let totalEndpoints = 0
const apiFolder = path.join(__dirname, './src/api')

fs.readdirSync(apiFolder).forEach(folder => {
  const folderPath = path.join(apiFolder, folder)
  if (fs.statSync(folderPath).isDirectory()) {
    fs.readdirSync(folderPath).forEach(file => {
      if (path.extname(file) === '.js') {
        require(path.join(folderPath, file))(app)
        totalRoutes++
        totalEndpoints++
        //console.log(chalk.bgYellow.black(` Loaded Route: ${file} `))
        console.log(
          chalk.bgBlue.white(`${chalk.bold.cyanBright('│')} `) + 
          chalk.yellowBright('Loaded Route') + 
          chalk.white(' : ') + 
          chalk.bold.green(file)
        )
      }
    })
  }
})

console.log(chalk.bgGreen.black('╰===>> Load Complete! ✓ '))

// ** ** *** *** ** ** *** *** ***
// CONSOLA RESUMEN
// ** ** *** *** ** ** *** *** ***
const h = chalk.blueBright('╭────────────────────────────···')
const t = chalk.blueBright('╰────────────────────────────···')
const v = chalk.blueBright('│')

console.log('\n' + h)
console.log(v, chalk.cyan('🍜 API STATUS'))
console.log(v, `Routers     : ${totalRoutes}`)
console.log(v, `Endpoints   : ${Object.keys(endpointStats).length || totalEndpoints}`)
console.log(v, `Users       : ${Object.keys(userRequests).length}`)
console.log(v, `Link        : http://localhost:${PORT}`)
console.log(t + '\n')
console.log(chalk.yellow('> © Powered by 𝐼\'𝑛 𝑠ℎ𝑎𝑑𝑜𝑤'))

// ** ** *** *** ** ** *** *** ***
// STATUS ENDPOINT (OPTIMIZADO)
// ** ** *** *** ** ** *** *** ***
app.get('/status-page', async (req, res) => {
  const start = Date.now()
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown'

  const uptimeSeconds = Math.floor((Date.now() - apiStartTime) / 1000)
  const uptimeFormatted = formatUptime(uptimeSeconds)

  let geo = {}
  try { geo = (await axios.get(`https://ipapi.co/${ip}/json/`)).data } catch { geo = { error: true } }

  // Usar datos cacheados (se actualizan cada 5 segundos)
  const { mem, cpu, cpuSpeed, cpuTemp, disk, osInfo, net, processes } = await getSystemInfo()

  const latency = Date.now() - start

  res.json({
    creator: settings.apiSettings.creator,
    uptime: uptimeFormatted,
    total_requests: requestCount,
    routes_loaded: totalRoutes,
    daily_limit: settings.apiSettings.limit,
    active_users: Object.keys(userRequests).length,
    current_date: new Date().toISOString(),
    api_latency_ms: latency,
    version: settings.version,
    user: {
      ip: ip,
      geo: {
        country: geo.country_name || 'Unknown',
        region: geo.region || 'Unknown',
        city: geo.city || 'Unknown',
        timezone: geo.timezone || 'Unknown',
        latitude: geo.latitude || null,
        longitude: geo.longitude || null,
        isp: geo.org || 'Unknown'
      }
    },
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      os_distro: osInfo.distro,
      release: osInfo.release,
      uptime_os_seconds: os.uptime(),
      cpu_model: cpu.brand,
      cores: cpu.cores,
      cpu_speed_ghz: cpuSpeed.avg,
      cpu_temperature_celsius: cpuTemp.main || 'N/A',
      ram_total_gb: (mem.total / 1e9).toFixed(2),
      ram_used_gb: ((mem.total - mem.available) / 1e9).toFixed(2),
      ram_free_gb: (mem.available / 1e9).toFixed(2),
      disk_total_gb: (disk[0]?.size / 1e9).toFixed(2),
      disk_used_gb: (disk[0]?.used / 1e9).toFixed(2),
      disk_free_gb: (disk[0]?.available / 1e9).toFixed(2),
      cpu_load_percent: cpuSpeed.avg ? cpuSpeed.avg * 10 : 'Unknown',
      running_processes: processes.all,
      network_interfaces: net.map(n => ({
        iface: n.iface,
        ip4: n.ip4,
        mac: n.mac,
        speed: n.speed
      }))
    }
  })
})

// ** ** *** *** ** ** *** *** ***
// PAGINAS
// ** ** *** *** ** ** *** *** ***
app.get('/public/favicon.ico', (req, res) => res.status(204))
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')) })
app.get('/docs', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'dash/docs.html')) })
app.get('/status', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'status.html')) })


app.get('/perfil', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'auth/perfil.html')) })
app.get('/login', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'auth/login.html')) })
app.get('/register', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'auth/register.html')) })


app.use((req, res) => { res.status(404).sendFile(process.cwd() + "/public/404.html") })
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).sendFile(process.cwd() + "/public/500.html")
})

app.listen(PORT, () => {
  console.log(chalk.bgGreen.black(` Server running on port ${PORT} `))
})

module.exports = app
