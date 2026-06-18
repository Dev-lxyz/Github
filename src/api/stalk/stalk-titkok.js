const axios = require("axios")

module.exports = function (app) {

  const BASE = "https://tokviewer.net/api"
  const HEADERS = {
    "accept": "application/json, text/plain, */*",
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0 (Linux; Android 13)",
    "origin": "https://tokviewer.net",
    "referer": "https://tokviewer.net/"
  }

  app.get("/stalk/tiktok", async (req, res) => {
    const { user } = req.query

    if (!user) {
      return res.status(400).json({
        status: false,
        error: "Falta parámetro: user"
      })
    }

    try {
      // 1️⃣ PERFIL (rápido)
      const profileReq = axios.post(
        `${BASE}/check-profile`,
        { username: user },
        { headers: HEADERS, timeout: 6000 }
      )

      // 2️⃣ VIDEOS (en paralelo)
      const videoReq = axios.post(
        `${BASE}/video`,
        { username: user, offset: 0, limit: 6 },
        { headers: HEADERS, timeout: 6000 }
      )

      const [profileRes, videoRes] = await Promise.all([profileReq, videoReq])

      const profile = profileRes.data?.data
      if (!profile) {
        return res.status(404).json({
          status: false,
          error: "Usuario no encontrado"
        })
      }

      const videos = videoRes.data?.data || []

      res.json({
        status: true,
        result: {
          user: {
            username: user,
            avatar: profile.avatar,
            followers: profile.followers,
            following: profile.following,
            likes: profile.likes,
            sec_uid: profile.sec_uid
          },
          videos: videos.map(v => ({
            cover: v.cover,
            download: v.downloadUrl,
            type: v.downloadUrl?.includes(".mp3")
              ? "music/photo"
              : "video"
          })),
          total_videos: videos.length
        }
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: "TokViewer falló",
        details: e.message
      })
    }
  })
}