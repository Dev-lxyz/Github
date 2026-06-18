const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

// Ruta correcta a la carpeta ./files
const filesDir = path.resolve('./files')

// Variable de control para evitar múltiples limpiezas simultáneas
let isCleaningInProgress = false

// Crear carpeta si no existe
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true })
  console.log(chalk.green('[Cleaner] Carpeta ./files creada'))
}

console.log(chalk.blue('[Cleaner] Limpieza de ./files activada (cada 5 minutos)'))
console.log(chalk.gray('[Cleaner] Ruta real:'), filesDir)

// Función para mostrar archivos con tipo y tamaño
async function showFiles() {
  try {
    const files = await fs.promises.readdir(filesDir)
    if (files.length === 0) {
      console.log(chalk.yellow('[Cleaner] No hay archivos en la carpeta ./files'))
      return
    }

    console.log(chalk.magenta('\n[Cleaner] Archivos en ./files:'))
    console.log(chalk.cyan('-------------------------------------------'))
    console.log(chalk.cyan('| Nombre          | Tipo      | Tamaño    |'))
    console.log(chalk.cyan('-------------------------------------------'))

    let totalSize = 0
    for (const file of files) {
      const filePath = path.join(filesDir, file)
      
      if (!fs.existsSync(filePath)) continue
      
      try {
        const stats = await fs.promises.stat(filePath)
        const ext = path.extname(file).slice(1) || 'desconocido'
        const sizeKB = (stats.size / 1024).toFixed(2)
        totalSize += stats.size
        
        const displayName = file.length > 15 ? file.substring(0, 12) + '...' : file
        console.log(`| ${displayName.padEnd(15)} | ${ext.padEnd(9)} | ${sizeKB.padEnd(7)} KB |`)
      } catch (statErr) {
        console.error(chalk.red(`[Cleaner] Error al stat ${file}:`), statErr.message)
      }
    }
    
    console.log(chalk.cyan('-------------------------------------------'))
    console.log(chalk.cyan(`Total: ${(totalSize / 1024).toFixed(2)} KB`))
    console.log(chalk.cyan('-------------------------------------------\n'))
  } catch (err) {
    console.error(chalk.red('[Cleaner] Error al mostrar archivos:'), err.message)
  }
}

// Función de limpieza mejorada
async function cleanFiles() {
  if (isCleaningInProgress) {
    console.log(chalk.yellow('[Cleaner] Limpieza ya en progreso, saltando...'))
    return
  }

  isCleaningInProgress = true

  try {
    const files = await fs.promises.readdir(filesDir)

    if (files.length === 0) {
      console.log(chalk.gray('[Cleaner] No hay archivos para limpiar'))
      isCleaningInProgress = false
      return
    }

    console.log(chalk.yellow(`[Cleaner] Eliminando ${files.length} archivo(s)...`))

    const errors = []
    
    for (const file of files) {
      const filePath = path.join(filesDir, file)
      
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath)
          console.log(chalk.dim(`  ✓ ${file} eliminado`))
        }
      } catch (deleteErr) {
        errors.push(`${file}: ${deleteErr.message}`)
        console.error(chalk.red(`  ✗ Error eliminando ${file}:`), deleteErr.message)
      }
    }

    if (errors.length === 0) {
      console.log(chalk.green(`[Cleaner] ${files.length} archivo(s) eliminado(s) con éxito\n`))
    } else {
      console.log(chalk.yellow(`[Cleaner] ${errors.length} error(es) durante la limpieza\n`))
    }
  } catch (err) {
    console.error(chalk.red('[Cleaner] Error crítico en limpieza:'), err.message)
  } finally {
    isCleaningInProgress = false
  }
}

// Mostrar archivos inicialmente
showFiles()

// Interval de limpieza cada 5 minutos
const cleanupInterval = setInterval(async () => {
  console.log(chalk.blue('[Cleaner] Ejecutando limpieza programada...'))
  await showFiles()
  await cleanFiles()
}, 5 * 60 * 1000)

// Permitir detener el cleaner gracefully
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n[Cleaner] Deteniendo limpiador...'))
  clearInterval(cleanupInterval)
  process.exit(0)
})

// Exportar para uso como módulo
module.exports = { showFiles, cleanFiles, filesDir }