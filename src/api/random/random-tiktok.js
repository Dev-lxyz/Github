const axios = require("axios")

module.exports = function (app) {

  const KEYWORDS = [
    "anime edit",
    "anime aesthetic",
    "amv",
    "phonk edit",
    "sad edit",
    "anime fight",
    "edit viral",
    "anime waifus",
    "fans anime",
    "tiktok viral",
    "viral",
    "animes",
    "edits",
    "Miku Sakura",
    "umi asanagi",
    "emision animes",
    "alya kujou",
    "roshidere",
    "edits shiina mahiru",
    "mahiru shiina",
    "edits umi asanagi",
    "edits Miku Sakura",
    "waifus", 
    "Protas animes",
    "Protas perdiendo control anime",
    "edits waifus"
  ]

  function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  app.get("/random/tiktok", async (req, res) => {
    try {

      // 🔥 siempre random
      const query = random(KEYWORDS)

      const params = new URLSearchParams()
      params.append("keywords", query)
      params.append("count", 30)
      params.append("cursor", Math.floor(Math.random() * 100))
      params.append("web", 1)
      params.append("hd", 1)

      const { data } = await axios.post(
        "https://tikwm.com/api/feed/search",
        params.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0"
          },
          timeout: 15000
        }
      )

      if (data.code !== 0 || !data.data?.videos?.length) {
        throw new Error("Sin resultados")
      }

      const videos = data.data.videos
      const v = random(videos)

      res.json({
        status: true,
        result: {
          id: v.video_id,
          title: v.title || "Sin título",
          author: {
            username: v.author.unique_id,
            nickname: v.author.nickname,
            avatar: "https://tikwm.com" + v.author.avatar
          },
          stats: {
            views: v.play_count,
            likes: v.digg_count,
            comments: v.comment_count,
            shares: v.share_count
          },
          video: {
            no_watermark: "https://tikwm.com" + v.play,
            watermark: "https://tikwm.com" + v.wmplay
          },
          music: "https://tikwm.com" + v.music,
          cover: "https://tikwm.com" + v.cover,
          source_query: query
        }
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: "Error random TikTok",
        message: e.message
      })
    }
  })

}