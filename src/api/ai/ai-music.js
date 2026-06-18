module.exports = function (app) {

  const crypto = require("crypto")

  const API = "https://remusic.ai/api/v1/ai-music/music"
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0"

  const STYLES = {
    genre: ["Pop", "Rock", "Hip-Hop", "R&B", "Jazz", "Classical", "Electronic", "EDM", "Lo-fi", "Ambient", "Reggae", "Country", "Folk", "Metal", "Blues", "Funk", "Soul", "Disco", "House", "Techno", "Trap", "Drum and Bass", "K-Pop", "J-Pop", "Latin", "Afrobeat", "Cinematic", "Orchestral", "Acoustic", "Punk", "Gospel", "Indie", "Synthwave", "Bossa Nova"],
    mood: ["Calm", "Happy", "Sad", "Energetic", "Romantic", "Epic", "Dark", "Dreamy", "Uplifting", "Melancholic", "Chill", "Aggressive", "Peaceful", "Nostalgic", "Mysterious", "Hopeful", "Sensual", "Playful", "Angry", "Triumphant"],
    vocal: ["Male Vocal", "Female Vocal", "Duet", "Choir", "Soft Vocal", "Powerful Vocal", "Rap", "Whisper"],
    tempo: ["Slow", "Mid-tempo", "Upbeat", "Fast"]
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const freshGa = () => `GA1.1.${Math.floor(Math.random() * 9e9 + 1e9)}.${Math.floor(Date.now() / 1000)}`
  const randIP = () => Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 254)).join(".")

  function headers() {
    return {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "origin": "https://remusic.ai",
      "referer": "https://remusic.ai/ai-music-generator",
      "user-agent": UA,
      "cookie": `_ga=${freshGa()}; anonymous_user_id=${crypto.randomUUID()}`,
      "x-forwarded-for": randIP()
    }
  }

  function pick(row) {
    return {
      id: row.song_id,
      title: row.title || null,
      status: row.status,
      audio: row.audio_url || null,
      image: row.image_url || row.cover_url || null,
      duration: row.duration || null,
      tags: row.tags || null,
      lyrics: row.lyrics || null,
      description: row.description || null
    }
  }

  async function createJob(body, maxRetries) {
    let last = "create failed"
    for (let i = 0; i < maxRetries; i++) {
      const res = await fetch(API, { method: "POST", headers: headers(), body: JSON.stringify(body) })
      const json = await res.json().catch(() => null)
      if (json && json.code === 100000 && Array.isArray(json.data) && json.data.length) return json.data
      last = json ? `${json.code}: ${json.message}` : `http ${res.status}`
      await sleep(600)
    }
    throw new Error(last)
  }

  async function pollJob(id, onProgress) {
    for (let i = 0; i < 70; i++) {
      await sleep(5000)
      const res = await fetch(`${API}/${id}`, { headers: headers() })
      const json = await res.json().catch(() => null)
      const row = Array.isArray(json?.data) ? json.data[0] : json?.data
      if (!row) continue
      if (onProgress) onProgress(row.percentage ?? 0, row.status)
      if (row.status === "success" && row.audio_url) return row
      if (["failed", "error", "fail"].includes(row.status)) throw new Error("generation failed")
    }
    throw new Error("generation timeout")
  }

  async function generateMusic(prompt, options = {}) {
    const {
      styles = [],
      title = null,
      lyrics = null,
      mv = "v4",
      supplier = 10,
      maxRetries = 6,
      onProgress = null
    } = options

    const tags = (Array.isArray(styles) ? styles : [styles]).filter(Boolean).join(", ")
    const custom = !!(title || lyrics)

    const body = custom
      ? { mode: 2, supplier, mv, is_instrumental: false, is_public: true, prompt: String(prompt || tags || title), title: title || "", tags, lyrics: lyrics || "" }
      : { mode: 1, supplier, mv, is_instrumental: false, is_public: true, prompt: tags ? `${prompt}, ${tags}` : String(prompt) }

    const jobs = await createJob(body, maxRetries)
    const songs = await Promise.all(jobs.map(j => pollJob(j.song_id, onProgress).then(pick).catch(() => ({ id: j.song_id, status: "failed", audio: null }))))

    return {
      ok: songs.some(s => s.audio),
      prompt: String(prompt || ""),
      styles: tags || null,
      mode: custom ? "custom" : "simple",
      count: songs.length,
      songs
    }
  }

  app.get('/ai/music', async (req, res) => {
    try {
      const { prompt, styles, title, lyrics, mv, supplier } = req.query

      if (!prompt && !title && !lyrics) {
        return res.json({
          status: false,
          error: 'Falta parametro ?prompt= (o ?title= / ?lyrics= para modo personalizado), router: /ai/music/styles'
        })
      }

      const stylesArr = styles
        ? String(styles).split(',').map(s => s.trim()).filter(Boolean)
        : []

      const result = await generateMusic(prompt || '', {
        styles: stylesArr,
        title: title || null,
        lyrics: lyrics || null,
        mv: mv || 'v4',
        supplier: supplier ? Number(supplier) : 10
      })

      res.json({
        status: result.ok,
        data: result
      })

    } catch (err) {
      res.json({
        status: false,
        error: err.message
      })
    }
  })

  // Lista de generos/moods/vocal/tempo disponibles para usar en ?styles=
  app.get('/ai/music/styles', (req, res) => {
    res.json({
      status: true,
      data: STYLES
    })
  })

}
