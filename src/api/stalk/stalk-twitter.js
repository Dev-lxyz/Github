module.exports = function (app) {
  const axios = require('axios')
  async function twitterUserTweets(username, cursor = '') {
    try {
      if (!username) {
        return {
          status: false,
          message: 'Username wajib diisi'
        }
      }

      username = username.replace(/^@/, '')

      const { data } = await axios.get(
        'https://www.twitter-viewer.com/api/x/user-tweets',
        {
          params: {
            username,
            cursor
          },
          headers: {
            accept: 'application/json',
            'user-agent':
              'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
          }
        }
      )

      if (!data?.success) {
        return {
          status: false,
          message: 'Gagal mengambil data tweet'
        }
      }

      const user = data.data?.user
      const tweets = data.data?.tweets || []
      const pagination = data.data?.pagination || {}

      return {
        status: true,
        user: {
          id: user?.restId,
          name: user?.displayName,
          username: user?.handle,
          bio: user?.bio,
          avatar: user?.avatar,
          banner: user?.banner,
          verified: user?.isVerified,
          protected: user?.protected,
          followers: user?.followersCount,
          following: user?.followingCount,
          tweetsCount: user?.tweetsCount,
          joinDate: user?.joinDate,
          location: user?.location || null,
          website: user?.website?.url || null
        },
        tweets: tweets.map(t => ({
          id: t.id,
          text: t.text,
          createdAt: t.createdAt,
          url: `https://x.com/${t.author?.handle}/status/${t.id}`,
          stats: {
            likes: t.stats?.likes || 0,
            retweets: t.stats?.retweets || 0,
            replies: t.stats?.replies || 0,
            quotes: t.stats?.quotes || 0,
            views: t.stats?.views || 0,
            bookmarks: t.stats?.bookmarks || 0
          },
          author: {
            id: t.author?.id,
            name: t.author?.displayName,
            username: t.author?.handle,
            avatar: t.author?.avatar,
            verified: t.author?.isVerified
          },
          media: (t.media || []).map(m => ({
            type: m.type,
            url: m.url,
            videoUrl: m.videoUrl || null,
            mediaKey: m.mediaKey
          })),
          flags: {
            isRetweet: t.isRetweet,
            isQuote: t.isQuote,
            hasImage: t.hasImage,
            hasVideo: t.hasVideo,
            hasGif: t.hasGif,
            hasLink: t.hasLink,
            hasLongText: t.hasLongText
          },
          quotedTweet: t.quotedTweet || null,
          retweetedTweet: t.retweetedTweet || null
        })),
        pagination: {
          nextCursor: pagination.nextCursor || null,
          prevCursor: pagination.prevCursor || null,
          hasMore: pagination.hasMore || false
        }
      }

    } catch (err) {

      return {
        status: false,
        message: err.response?.data || err.message
      }

    }

  }

  function cleanNull(obj) {

    if (Array.isArray(obj)) {
      return obj.map(cleanNull)
    }

    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, value]) =>
            value !== null &&
            value !== undefined
          )
          .map(([key, value]) => [
            key,
            cleanNull(value)
          ])
      )
    }

    return obj

  }

  app.get('/stalk/twitter', async (req, res) => {
    try {
      const {
        user,
        cursor = ''
      } = req.query

      if (!user) {
        return res.json({
          status: false,
          error: 'Falta parametro ?user='
        })
      }

      const result =
        await twitterUserTweets(
          user,
          cursor
        )

      res.json(
        cleanNull(result)
      )

    } catch (e) {

      res.json({
        status: false,
        error: e.message
      })

    }

  })

}