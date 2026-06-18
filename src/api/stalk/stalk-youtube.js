module.exports = function (app) {
  const axios = require('axios')

  async function ytChannel(user) {

    user = String(user || '')
      .replace(/^@/, '')
      .trim()

    if (!user) {
      throw new Error('Falta user')
    }

    const channelUrl =
      `https://youtube.com/@${user}`

    const { data: resolve } =
      await axios.get(
        'https://ytapi.apps.mattw.io/v1/resolve_url',
        {
          params: {
            url: channelUrl
          },
          headers: {
            accept: 'application/json, text/javascript, */*; q=0.01'
          },
          timeout: 20000
        }
      )

    const channelId =
      resolve?.channelId

    if (!channelId) {
      throw new Error(
        'Channel ID no encontrado'
      )
    }

    const { data } =
      await axios.get(
        'https://ytapi.apps.mattw.io/v3/channels',
        {
          params: {
            key: 'foo1',
            quotaUser:
              Math.random()
                .toString(36)
                .slice(2),
            part:
              'id,snippet,statistics,brandingSettings,contentDetails,localizations,status,topicDetails',
            id: channelId,
            _: Date.now()
          },
          headers: {
            accept: 'application/json, text/javascript, */*; q=0.01'
          },
          timeout: 20000
        }
      )

    const item =
      data?.items?.[0]

    if (!item) {
      throw new Error(
        'Canal no encontrado'
      )
    }

    return {
      id: item.id,
      title: item.snippet?.title || null,
      user: item.snippet?.customUrl || null,
      description: item.snippet?.description || null,
      publishedAt: item.snippet?.publishedAt || null,
      thumbnail:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        null,
      banner:
        item.brandingSettings?.image?.bannerExternalUrl ||
        null,
      statistics: {
        subscribers:
          Number(
            item.statistics?.subscriberCount || 0
          ),
        views:
          Number(
            item.statistics?.viewCount || 0
          ),
        videos:
          Number(
            item.statistics?.videoCount || 0
          ),
        hiddenSubscribers:
          item.statistics?.hiddenSubscriberCount ||
          false
      },
      uploadsPlaylist:
        item.contentDetails?.relatedPlaylists?.uploads ||
        null,
      topics:
        item.topicDetails?.topicCategories ||
        [],

      url:
        `https://youtube.com/${
          item.snippet?.customUrl ||
          `channel/${item.id}`
        }`
    }

  }

  app.get('/stalk/youtube', async (req, res) => {
    try {
      const { user } = req.query
      if (!user) {
        return res.json({
          status: false,
          error:
            'Falta parametro ?user='
        })
      }
      const result = await ytChannel(user)
      res.json({
        status: true,
        data: result
      })

    } catch (err) {
      res.json({
        status: false,
        error:
          err.response?.data ||
          err.message
      })

    }
  })

}