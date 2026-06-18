const { createCanvas, GlobalFonts, loadImage } = require("@napi-rs/canvas")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const axios = require("axios")
const { spawn } = require("child_process")
const { promisify } = require("util")

const writeFileAsync = promisify(fs.writeFile)

module.exports = function (app) {

  // ── /canvas/attp — texto animado con colores ──────────────────────────────
  app.get("/canvas/attp", async (req, res) => {
    let tempDir = ""

    try {
      const { text } = req.query

      if (!text)
        return res.status(400).json({ status: false, message: "Falta el parámetro 'text'" })

      const width  = 400
      const height = 400
      const frames = 30
      const fps    = 10  // 30 frames / 3s

      const fontPath = path.join(process.cwd(), "src", "services", "canvas", "font", "LEMONMILK-Bold.otf")

      if (!fs.existsSync(fontPath))
        return res.status(500).json({ status: false, message: "Font no encontrada" })

      GlobalFonts.registerFromPath(fontPath, "LEMONMILK")

      const colors = [
        "#FF0000","#FF7F00","#FFFF00","#00FF00","#00FFFF",
        "#0000FF","#8B00FF","#FF00FF","#FF69B4","#FFA500",
        "#00BFFF","#8A2BE2","#FFD700","#00FF7F","#FF4500"
      ]

      // carpeta temporal para frames
      tempDir = path.join(process.cwd(), "files", crypto.randomBytes(8).toString("hex"))
      fs.mkdirSync(tempDir, { recursive: true })

      // partir el texto en líneas (reutilizable)
      function getLines(ctx, txt, maxWidth) {
        const words = txt.split(" ")
        const lines = []
        let line = ""
        for (const word of words) {
          const test = line + word + " "
          if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line.trim())
            line = word + " "
          } else {
            line = test
          }
        }
        if (line.trim()) lines.push(line.trim())
        return lines
      }

      for (let i = 0; i < frames; i++) {
        const canvas = createCanvas(width, height)
        const ctx    = canvas.getContext("2d")

        // fondo negro
        ctx.fillStyle = "#000"
        ctx.fillRect(0, 0, width, height)

        // color del frame actual
        const color = colors[i % colors.length]

        ctx.font         = "bold 48px LEMONMILK"
        ctx.textAlign    = "center"
        ctx.textBaseline = "middle"

        const lines   = getLines(ctx, text, width - 40)
        const lineH   = 54
        let y         = height / 2 - ((lines.length - 1) * lineH) / 2

        for (const l of lines) {
          // sombra / contorno negro
          ctx.strokeStyle = "#000"
          ctx.lineWidth   = 4
          ctx.strokeText(l, width / 2, y)

          // texto coloreado
          ctx.fillStyle = color
          ctx.fillText(l, width / 2, y)
          y += lineH
        }

        const framePath = path.join(tempDir, `frame_${String(i).padStart(4, "0")}.png`)
        await writeFileAsync(framePath, canvas.toBuffer("image/png"))
      }

      // convertir frames → gif con ffmpeg
      const outName = crypto.randomBytes(16).toString("hex") + ".gif"
      const outPath = path.join(process.cwd(), "files", outName)

      const ffmpegArgs = [
        "-y",
        "-framerate", String(fps),
        "-i", path.join(tempDir, "frame_%04d.png"),
        "-vf", "split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse",
        outPath
      ]

      await new Promise((resolve, reject) => {
        const ff = spawn("ffmpeg", ffmpegArgs)
        ff.on("close", code => {
          // limpiar frames
          fs.rmSync(tempDir, { recursive: true, force: true })
          tempDir = ""
          if (code !== 0) reject(new Error("FFmpeg falló al generar GIF"))
          else resolve()
        })
        ff.on("error", reject)
      })

      return res.json({
        status: true,
        result: {
          url:      `${req.protocol}://${req.get("host")}/files/${outName}`,
          filename: outName,
          mimetype: "image/gif"
        }
      })

    } catch (err) {
      if (tempDir && fs.existsSync(tempDir))
        fs.rmSync(tempDir, { recursive: true, force: true })

      return res.status(500).json({ status: false, message: err.message })
    }
  })

  // ── /canvas/save-image — descargar imagen de URL y guardar en /files ──────
  app.get("/canvas/save-image", async (req, res) => {
    try {
      const { url: imgUrl } = req.query

      if (!imgUrl)
        return res.status(400).json({ status: false, message: "Falta el parámetro 'url'" })

      const response = await axios.get(imgUrl, {
        responseType: "arraybuffer",
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      })

      // detectar extensión desde URL o content-type
      let ext = path.extname(imgUrl.split("?")[0]) || ""
      if (!ext) {
        const ct = response.headers["content-type"] || ""
        const map = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp" }
        ext = map[ct.split(";")[0].trim()] || ".png"
      }

      const name     = crypto.randomBytes(16).toString("hex") + ext
      const filePath = path.join(process.cwd(), "files", name)

      fs.writeFileSync(filePath, response.data)

      return res.json({
        status: true,
        result: {
          url:      `${req.protocol}://${req.get("host")}/files/${name}`,
          filename: name,
          mimetype: response.headers["content-type"] || "image/png",
          size:     response.data.length
        }
      })

    } catch (err) {
      return res.status(500).json({ status: false, message: err.message })
    }
  })

}
