const axios = require('axios')

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
}

// 🔢 formateo
function formatNumber(n) {
  if (!n) return '0'
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

// 🔍 función completa
async function tiktokFull(username) {
  const clean = username.replace(/^@/, '').trim()
  if (!clean) throw new Error('Username inválido')

  const { data } = await axios.get(
    `https://tikwm.com/api/user/info?unique_id=${encodeURIComponent(clean)}`,
    { headers: HEADERS, timeout: 15000 }
  )

  if (data?.code !== 0 || !data?.data) {
    throw new Error(data?.msg || 'Usuario no encontrado')
  }

  const u = data.data.user
  const s = data.data.stats

  const followers = s.followerCount || 0
  const following = s.followingCount || 0
  const likes = s.heartCount || 0
  const videos = s.videoCount || 0
  const friends = s.friendCount || 0
  const avgLikes = videos > 0 ? Math.round(likes / videos) : 0

  return {
    // 🆔 INFO BÁSICA
    id: u.id,
    secUid: u.secUid,
    username: u.uniqueId,
    nickname: u.nickname,
    bio: u.signature,
    region: u.region,
    language: u.language,

    // 🖼️ AVATAR
    avatar: {
      large: u.avatarLarger,
      medium: u.avatarMedium,
      thumb: u.avatarThumb
    },

    // 🔐 ESTADO
    verified: u.verified,
    private: u.privateAccount,
    commerceUser: u.commerceUserInfo?.commerceUser || false,

    // 🌐 REDES
    social: {
      bioLink: u.bioLink?.link || null,
      instagram: u.ins_id || null,
      twitter: u.twitter_id || null,
      youtube: u.youtube_channel_title || null
    },

    // 📅 FECHAS
    createdAt: u.createTime
      ? new Date(u.createTime * 1000).toISOString()
      : null,

    // 📊 ESTADÍSTICAS
    stats: {
      followers,
      following,
      friends,
      likes,
      videos,
      avgLikes,

      followersStr: formatNumber(followers),
      followingStr: formatNumber(following),
      friendsStr: formatNumber(friends),
      likesStr: formatNumber(likes),
      videosStr: formatNumber(videos),
      avgLikesStr: formatNumber(avgLikes)
    },

    // 🔥 EXTRA DATA RAW (por si quieres TODO)
    raw: data.data,

    // 🔗 LINK
    url: `https://www.tiktok.com/@${u.uniqueId}`
  }
}

// 🚀 ENDPOINT
module.exports = function (app) {

  app.get('/stalk/tiktok/v2', async (req, res) => {
    try {
      const { user } = req.query

      if (!user) {
        return res.json({
          status: false,
          error: 'Falta parámetro ?user='
        })
      }

      const result = await tiktokFull(user)

      res.json({
        status: true,
        result
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })

}