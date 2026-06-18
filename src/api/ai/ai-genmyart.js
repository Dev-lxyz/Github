const axios = require('axios')

const BASE_URL = 'https://genmyart.com'
const AJAX_URL = `${BASE_URL}/wp-admin/admin-ajax.php`

const STYLES = ['photorealistic', 'digital-art', 'impressionist', 'anime', 'fantasy', 'sci-fi', 'vintage', 'watercolor', 'ghibli', 'cyberpunk', 'surrealist', 'minimalist', 'baroque']
const RESOLUTIONS = ['512x512', '768x768', '1024x1024', '1280x720', '1920x1080', '2560x1440', '3840x2160']
const ASPECT_RATIOS = ['square', 'portrait', 'landscape']

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
}

async function getNonce() {
  const { data } = await axios.get(BASE_URL, { headers: HEADERS, timeout: 15000 })
  const match = data.match(/_ajax_nonce:\s*'([a-f0-9]+)'/)
  if (!match) throw new Error('Nonce no encontrado — la estructura de la página puede haber cambiado')
  return match[1]
}

async function generateImage({ prompt, style = 'photorealistic', resolution = '1024x1024', aspectRatio = 'square', numImages = 1 }) {
  if (!prompt?.trim()) throw new Error('Falta el prompt')
  if (!STYLES.includes(style)) throw new Error(`Style inválido. Disponibles: ${STYLES.join(', ')}`)
  if (!RESOLUTIONS.includes(resolution)) throw new Error(`Resolution inválida. Disponibles: ${RESOLUTIONS.join(', ')}`)
  if (!ASPECT_RATIOS.includes(aspectRatio)) throw new Error(`Aspect ratio inválido. Disponibles: ${ASPECT_RATIOS.join(', ')}`)
  if (numImages < 1 || numImages > 6) throw new Error('numImages debe ser entre 1 y 6')

  const nonce = await getNonce()

  const params = new URLSearchParams({
    action: 'generate_ai_image',
    ai_prompt: prompt,
    ai_style: style,
    ai_resolution: resolution,
    ai_aspect_ratio: aspectRatio,
    ai_num_images: String(numImages),
    _ajax_nonce: nonce,
  })

  const { data } = await axios.post(AJAX_URL, params.toString(), {
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': '*/*',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': BASE_URL,
    },
    timeout: 30000,
  })

  if (!data.success) throw new Error(data.message || 'Error al generar imagen')

  return {
    prompt: data.prompt,
    style: data.style,
    resolution,
    aspectRatio,
    total: data.images?.length || 0,
    images: data.images,
  }
}

module.exports = function (app) {

  // 📋 Info de opciones
  // GET /ai/genmyart/info
  app.get('/ai/genmyart/info', (req, res) => {
    return res.json({
      status: true,
      styles: STYLES,
      resolutions: RESOLUTIONS,
      aspectRatios: ASPECT_RATIOS,
      maxImages: 6,
    })
  })

  // 🎨 Generar imagen
  // GET /ai/genmyart?prompt=...&style=anime&resolution=1024x1024&ratio=square&num=1
  app.get('/ai/genmyart', async (req, res) => {
    try {
      const {
        prompt,
        style = 'photorealistic',
        resolution = '1024x1024',
        ratio = 'square',
        num = '1',
      } = req.query

      if (!prompt)
        return res.status(400).json({
          status: false,
          message: 'Falta ?prompt=',
          info: '/ai/genmyart/info para ver opciones disponibles',
        })

      const numImages = parseInt(num)
      if (isNaN(numImages) || numImages < 1 || numImages > 6)
        return res.status(400).json({
          status: false,
          message: 'num debe ser un número entre 1 y 6',
        })

      if (!STYLES.includes(style))
        return res.status(400).json({
          status: false,
          message: `Style inválido. Disponibles: ${STYLES.join(', ')}`,
        })

      if (!RESOLUTIONS.includes(resolution))
        return res.status(400).json({
          status: false,
          message: `Resolution inválida. Disponibles: ${RESOLUTIONS.join(', ')}`,
        })

      if (!ASPECT_RATIOS.includes(ratio))
        return res.status(400).json({
          status: false,
          message: `Ratio inválido. Disponibles: ${ASPECT_RATIOS.join(', ')}`,
        })

      const result = await generateImage({
        prompt,
        style,
        resolution,
        aspectRatio: ratio,
        numImages,
      })

      return res.json({ status: true, ...result })

    } catch (err) {
      return res.status(500).json({ status: false, message: err.message })
    }
  })

}