const axios   = require("axios")
const FormData = require("form-data")
const fs      = require("fs")
const fsp     = require("fs/promises")
const path    = require("path")
const crypto  = require("crypto")
const mime    = require("mime-types")

const API        = "https://api.freeconvert.com/v1/process/jobs"
const CHUNK_SIZE = 5242880
const TIMEOUT    = 180000
const UA         = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"

const FORMAT_ALIAS = { jpg: "jpeg", tif: "tiff" }

const SUPPORTED = new Set([
  "jpeg","png","webp","avif","gif","bmp","tiff","ico","svg","pdf","heic","heif"
])

const sleep       = ms => new Promise(r => setTimeout(r, ms))
const normFmt     = f  => FORMAT_ALIAS[f = String(f||"").toLowerCase().replace(/^\./,"").trim()] || f
const outExt      = f  => ({ jpeg:"jpg", tiff:"tiff" })[normFmt(f)] || normFmt(f)
const cleanName   = n  => String(n||"file").replace(/[^\w.-]+/g,"_")
const pickTask    = (job, name) => job.tasks.find(t => t.name === name || t.operation === name)

function collectUrls(value, out = []) {
  if (!value) return out
  if (typeof value === "string" && /^https?:\/\//i.test(value)) out.push(value)
  if (Array.isArray(value)) for (const v of value) collectUrls(v, out)
  if (typeof value === "object") for (const v of Object.values(value)) collectUrls(v, out)
  return out
}

function normalizeServer(url) {
  const u = new URL(url)
  u.hostname = u.hostname.replace(/^server(\d+)-/, "s$1-")
  return u
}

function buildOptions(from, to) {
  const opts = { "auto-orient": true, strip: true }
  if (["jpeg","webp","avif","heic","heif"].includes(to)) opts.quality = 100
  if (to === "jpeg") opts.background = "#FFFFFF"
  return opts
}

async function createJob(from, to) {
  const { data, status } = await axios.post(API, {
    tasks: {
      import:       { operation: "import/upload" },
      convert:      { operation: "convert", input: "import", input_format: from, output_format: to, options: buildOptions(from, to) },
      "export-url": { operation: "export/url", input: "convert" }
    }
  }, {
    timeout: TIMEOUT,
    validateStatus: () => true,
    headers: { authorization: "Bearer null", accept: "application/json", "content-type": "application/json", origin: "https://www.freeconvert.com", referer: `https://www.freeconvert.com/${from}-to-${to}/download`, "user-agent": UA }
  })
  if (status !== 201 && status !== 200) throw new Error(`createJob HTTP ${status}`)
  return data
}

async function uploadChunk(server, taskId, identifier, filename, type, fileSize, chunk, chunkNum, totalChunks) {
  const form = new FormData()
  const qs   = new URLSearchParams({
    resumableChunkNumber: String(chunkNum), resumableChunkSize: String(CHUNK_SIZE),
    resumableCurrentChunkSize: String(chunk.length), resumableTotalSize: String(fileSize),
    resumableType: type, resumableIdentifier: identifier,
    resumableFilename: filename, resumableRelativePath: filename,
    resumableTotalChunks: String(totalChunks)
  })
  for (const [k,v] of qs) form.append(k, v)
  form.append("file", chunk, { filename, contentType: "application/octet-stream", knownLength: chunk.length })

  const { status } = await axios.post(`${server.origin}/api/resumable/${taskId}?${qs}`, form, {
    timeout: TIMEOUT, validateStatus: () => true, maxBodyLength: Infinity,
    headers: { ...form.getHeaders(), accept: "*/*", origin: "https://www.freeconvert.com", referer: "https://www.freeconvert.com/", "user-agent": UA }
  })
  if (status !== 200) throw new Error(`uploadChunk ${chunkNum} HTTP ${status}`)
}

async function joinChunks(server, taskId, identifier, fileSize) {
  const form = new FormData()
  form.append("identifier", identifier)
  form.append("fileSize", String(fileSize))
  const { status } = await axios.post(`${server.origin}/api/resumable/join/${taskId}`, form, {
    timeout: TIMEOUT, validateStatus: () => true,
    headers: { ...form.getHeaders(), accept: "application/json", origin: "https://www.freeconvert.com", referer: "https://www.freeconvert.com/", "user-agent": UA }
  })
  if (status !== 200) throw new Error(`joinChunks HTTP ${status}`)
}

async function finishUpload(server, taskId, identifier, filename, signature) {
  const form = new FormData()
  form.append("identifier", identifier)
  form.append("fileName", filename)
  form.append("signature", signature)
  const { status } = await axios.post(`${server.origin}/api/upload/${taskId}`, form, {
    timeout: TIMEOUT, validateStatus: () => true,
    headers: { ...form.getHeaders(), accept: "application/json", origin: "https://www.freeconvert.com", referer: "https://www.freeconvert.com/", "user-agent": UA }
  })
  if (status !== 200) throw new Error(`finishUpload HTTP ${status}`)
}

async function pollJob(selfUrl, server, exportTaskId, outputFilename) {
  for (let i = 0; i < 90; i++) {
    const { data: job, status } = await axios.get(selfUrl, {
      timeout: TIMEOUT, validateStatus: () => true,
      headers: { authorization: "Bearer null", accept: "application/json", origin: "https://www.freeconvert.com", referer: "https://www.freeconvert.com/", "user-agent": UA }
    })
    if (status !== 200) throw new Error(`pollJob HTTP ${status}`)

    const exportTask = pickTask(job, "export/url")

    if (exportTask?.status === "completed" || exportTask?.status === "done") {
      const urls = collectUrls(exportTask.result || exportTask)
      return urls[0] || `${server.origin}/task/${exportTaskId}/${outputFilename}`
    }

    if (["failed","error"].includes(job.status)) throw new Error(`Convert falló: ${JSON.stringify(job)}`)

    await sleep(2000)
  }
  return `${server.origin}/task/${exportTaskId}/${outputFilename}`
}

async function convertFromUrl(imgUrl, to) {
  // 1. Descargar imagen
  const dlRes = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 30000, headers: { "user-agent": UA } })
  const buffer = Buffer.from(dlRes.data)

  // detectar extensión
  const ct  = dlRes.headers["content-type"] || ""
  const extFromMime = mime.extension(ct.split(";")[0].trim()) || ""
  const extFromUrl  = path.extname(imgUrl.split("?")[0]).replace(".", "")
  const fromRaw     = extFromUrl || extFromMime || "png"
  const from        = normFmt(fromRaw)
  const toFmt       = normFmt(to)

  if (!SUPPORTED.has(from) && from !== "jpg") throw new Error(`Formato de entrada no soportado: ${from}`)
  if (!SUPPORTED.has(toFmt))                  throw new Error(`Formato de salida no soportado: ${toFmt}. Usa: ${[...SUPPORTED].join(", ")}`)
  if (from === toFmt)                          throw new Error(`El formato origen y destino son iguales: ${toFmt}`)

  // 2. Guardar temporalmente
  const tmpName = `${crypto.randomBytes(8).toString("hex")}.${fromRaw}`
  const tmpPath = path.join(process.cwd(), "files", tmpName)
  await fsp.mkdir(path.dirname(tmpPath), { recursive: true })
  await fsp.writeFile(tmpPath, buffer)

  try {
    const fileSize      = buffer.length
    const filename      = cleanName(tmpName)
    const basename      = path.basename(filename, path.extname(filename))
    const outputFilename = `${basename}.${outExt(toFmt)}`
    const mimeType      = mime.lookup(tmpPath) || `image/${from}`
    const identifier    = `${fileSize}-${crypto.randomInt(1000,9999)}-${basename}-${crypto.randomBytes(8).toString("hex")}${from}.${fromRaw}`

    // 3. Crear job
    const job        = await createJob(from, toFmt)
    const importTask = pickTask(job, "import/upload")
    const exportTask = pickTask(job, "export/url")

    if (!importTask?.result?.form?.url || !importTask?.result?.form?.parameters?.signature)
      throw new Error("Form upload no encontrado en la respuesta")
    if (!exportTask?.id)
      throw new Error("Export task no encontrada")

    const server    = normalizeServer(importTask.result.form.url)
    const signature = importTask.result.form.parameters.signature
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)

    // 4. Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const chunk = buffer.subarray(start, Math.min(start + CHUNK_SIZE, fileSize))
      await uploadChunk(server, importTask.id, identifier, filename, mimeType, fileSize, chunk, i + 1, totalChunks)
    }

    await joinChunks(server, importTask.id, identifier, fileSize)
    await finishUpload(server, importTask.id, identifier, filename, signature)

    // 5. Poll hasta terminar
    const resultUrl = await pollJob(job.links.self, server, exportTask.id, outputFilename)

    return { from, to: toFmt, url: resultUrl }

  } finally {
    // limpiar tmp
    fs.existsSync(tmpPath) && fs.unlinkSync(tmpPath)
  }
}
module.exports = function (app) {

  // GET /tools/convert?url=https://...&to=png
  app.get("/tools/image-convert", async (req, res) => {
    try {
      const { url, to } = req.query

      if (!url) return res.status(400).json({ status: false, message: "Falta ?url=" })
      if (!to)  return res.status(400).json({ status: false, message: "Falta ?to= (jpeg, png, webp, gif, pdf, etc)" })

      const result = await convertFromUrl(url, to)

      return res.json({
        status: true,
        from:   result.from,
        to:     result.to,
        result: { url: result.url }
      })

    } catch (e) {
      return res.status(500).json({ status: false, message: e.message })
    }
  })

}
