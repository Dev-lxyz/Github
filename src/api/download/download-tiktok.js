module.exports = function (app) {
  const axios = require("axios")

  const formatNumber = (num) =>
    new Intl.NumberFormat("de-DE").format(num || 0)

  const formatDuration = (sec) => {
    if (!sec) return "0:00"
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const formatDateTime = (timestamp) => {
  if (!timestamp) return ""

  return new Date(timestamp * 1000).toLocaleString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  })
  .replace(",", "")
  .replace(/^\w/, c => c.toUpperCase())
  }
  app.get("/download/tiktok", async (req, res) => {
    try {
      const { url } = req.query

      if (!url)
        return res.json({
          status: false,
          message: "Falta el parámetro 'url'"
        })

      const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`
      const { data } = await axios.get(api, {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        }
      })

      if (!data || data.code !== 0)
        return res.json({
          status: false,
          message: "No se pudo procesar el video"
        })

      const v = data.data

      const sizeMB = v.size
        ? (v.size / 1048576).toFixed(2) + " MB"
        : "0.00 MB"

      res.json({
        status: true,
        data: {
          id: v.id,
          title: v.title || "",
          duration: formatDuration(v.duration),
          region: v.region || "",
          author: {
            username: v.author?.unique_id || "",
            name: v.author?.nickname || "",
            avatar: v.author?.avatar || ""
          },
          size: sizeMB,
          status: v.play ? "Available" : "Not Available",
          likes: formatNumber(v.digg_count),
          comments: formatNumber(v.comment_count),
          views: formatNumber(v.play_count),
          favorites: formatNumber(v.collect_count),
          shares: formatNumber(v.share_count),
          downloads: formatNumber(v.download_count || "0"),
          date: formatDateTime(v.create_time),
          audio: `᥆rіgіᥒᥲᥣ s᥆ᥙᥒძ - ${v.author?.nickname} - ${v.author?.unique_id}`,
          link: `https://www.tiktok.com/@${v.author?.unique_id}/video/${v.id}`,
          download: v.play,
          watermark: v.wmplay,
          cover: v.cover
        }
      })

    } catch (error) {
      res.json({
        status: false,
        message: "Error al procesar la solicitud"
      })
    }
  })
}