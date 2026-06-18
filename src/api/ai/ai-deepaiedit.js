module.exports = function (app) {

  const crypto = require("crypto")

  const AGENT = "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36"
  const SALT = "hackers_become_a_little_stinkier_every_time_they_hack"

  const md5 = s => crypto.createHash("md5").update(s).digest("hex")
  const reverse = s => s.split("").reverse().join("")
  const generateRandomIP = () => Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 254)).join(".")

  const mimeFromUrl = (url) => {
    const ext = (url.split("?")[0].match(/\.[0-9a-z]+$/i) || [""])[0].toLowerCase()
    return { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }[ext] || "image/jpeg"
  }

  function genKEY() {
    const r = String(Math.floor(Math.random() * 1e11))
    const h1 = reverse(md5(AGENT + r + SALT))
    const h2 = reverse(md5(AGENT + h1))
    const h3 = reverse(md5(AGENT + h2))
    return `tryit-${r}-${h3}`
  }

  async function editImage(imageUrl, prompt) {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error(`No se pudo descargar la imagen (status ${imgRes.status})`)
    const buf = Buffer.from(await imgRes.arrayBuffer())

    const filename = (imageUrl.split("/").pop() || "image.jpg").split("?")[0]

    let last = "request failed"
    for (let i = 0; i < 6; i++) {
      const form = new FormData()
      form.append("image", new Blob([buf], { type: mimeFromUrl(imageUrl) }), filename)
      form.append("text", prompt)
      form.append("image_generator_version", "standard")

      try {
        const res = await fetch("https://api.deepai.org/api/image-editor", {
          method: "POST",
          headers: {
            accept: "*/*",
            origin: "https://deepai.org",
            referer: "https://deepai.org/",
            "user-agent": AGENT,
            "api-key": genKEY(),
            "x-forwarded-for": generateRandomIP()
          },
          body: form
        })

        const json = await res.json().catch(() => null)

        if (json?.output_url) {
          return { success: true, output_url: json.output_url, id: json.id }
        }

        last = json?.status || `http ${res.status}`
      } catch (e) {
        last = e.message
      }
    }

    throw new Error(last)
  }

  app.get('/ai/deepai-edit', async (req, res) => {
    try {
      const { img, prompt } = req.query

      if (!img || !prompt) {
        return res.json({
          status: false,
          error: "Faltan parametros ?img= y ?prompt="
        })
      }

      const result = await editImage(img, prompt)

      res.json({
        status: true,
        data: result
      })

    } catch (err) {
      res.json({
        status: false,
        error: err.message
      })
    }
  })

}
