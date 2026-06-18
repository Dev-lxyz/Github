const https = require("https")

module.exports = function(app) {

  function httpsGet(hostname, path, headers = {}) {
    return new Promise((resolve, reject) => {

      const req = https.request(
        {
          hostname,
          path,
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            "Accept": "*/*",
            "Accept-Language":
              "id-ID,id;q=0.9,en;q=0.8",
            "RSC": "1",
            "Next-Router-State-Tree":
              encodeURIComponent(
                JSON.stringify([
                  "",
                  {
                    children: [
                      "discover",
                      {
                        children: [
                          "__PAGE__",
                          {},
                          "/discover",
                          "refresh"
                        ]
                      }
                    ]
                  },
                  null,
                  null,
                  true
                ])
              ),
            "Next-Url": "/discover",
            ...headers
          }
        },

        (res) => {
          let data = ""
          res.on("data", c => data += c)
          res.on("end", () => {
            resolve({
              status: res.statusCode,
              body: data
            })
          })
          res.on("error", reject)
        }
      )

      req.on("error", reject)

      req.end()

    })
  }

  function parseRSC(body) {

    const feedMatch =
      body.match(
        /"feeds":(\[[\s\S]*?\]),"podName"/
      )

    if (feedMatch) {
      try {
        return JSON.parse(feedMatch[1])
      } catch {}
    }

    const ldMatch =
      body.match(
        /\{"@context":"https:\/\/schema\.org\/","@type":"ItemList"[\s\S]*?(?=\}4:\[|\}\s*$)/
      )

    if (ldMatch) {
      try {

        const json =
          JSON.parse(ldMatch[0] + "}")

        return json.itemListElement || []

      } catch {}
    }
    return null
  }

  function formatFeed(feed) {

    return {
      photoId: feed.photo_id_str,
      caption:
        feed.caption || "",
      username:
        feed.user_name || feed.kwai_id,
      kwaiId:
        feed.kwai_id,
      userId:
        String(
          feed.user_id ||
          feed.user_id_str ||
          ""
        ),

      uploadTime:
        feed.time,
      views:
        feed.view_count || 0,
      likes:
        feed.like_count || 0,
      comments:
        feed.comment_count || 0,
      shares:
        feed.forward_count || 0,
      duration:
        feed.transcode_manifest_info
          ?.adaptationSet?.[0]?.duration
          ? Math.round(
              feed
                .transcode_manifest_info
                .adaptationSet[0]
                .duration / 1000
            )
          : null,
      dl_url:
        feed.main_mv_urls?.[0]?.url || null,
      thumbnail:
        feed.cover_thumbnail_urls?.[0]?.url || null,
      avatar:
        feed.headurls?.[0]?.url || null,
      pageUrl:
        `https://www.snackvideo.com/@${feed.kwai_id}/video/${feed.photo_id_str}`,
      allowDownload:
        feed.allowDownload ?? true
    }

  }

  function formatSchemaVideo(item) {

    const v =
      item.innerHTML || item

    const creator =
      v.creator?.mainEntity || {}

    const stats =
      v.interactionStatistic || []

    const getStat = (type) =>
      stats.find(s =>
        s.interactionType?.["@type"]
          ?.includes(type)
      )?.userInteractionCount || 0

    return {
      photoId:
        v.mainEntityOfPage?.["@id"]
          ?.split("/video/")[1] || null,
      caption:
        v.description || "",
      username:
        creator.alternateName ||
        creator.name ||
        "",
      uploadTime:
        v.uploadDate || null,
      duration:
        v.duration || null,
      views:
        getStat("Watch"),
      likes:
        getStat("Like"),
      shares:
        getStat("Share"),
      comments:
        v.commentCount || 0,
      dl_url:
        v.contentUrl || null,
      thumbnail:
        v.thumbnailUrl?.[0] || null,
      pageUrl:
        v.url || null,
      transcript:
        v.transcript || null,
      creatorFollowers:
        creator.interactionStatistic
          ?.find(s =>
            s.interactionType?.["@type"]
              ?.includes("Follow")
          )
          ?.userInteractionCount || 0
    }

  }

  async function scrapeSnackVideo(keyword) {

    const path =
      `/discover/${encodeURIComponent(keyword)}?_rsc=1g428`

    const res =
      await httpsGet(
        "snackvideo.com",
        path
      )

    if (res.status !== 200) {
      throw new Error(
        `HTTP ${res.status}`
      )
    }

    const raw = res.body

    const feeds = parseRSC(raw)

    if (!feeds) {
      throw new Error(
        "No se pudo parsear la respuesta"
      )
    }

    let videos

    if (feeds[0]?.photo_id_str) {

      videos =
        feeds.map(formatFeed)

    } else if (
      feeds[0]?.["@type"] === "VideoObject" ||
      feeds[0]?.innerHTML
    ) {

      videos =
        feeds.map(formatSchemaVideo)

    } else {

      throw new Error(
        "Formato desconocido"
      )

    }

    const totalMatch =
      raw.match(/"(\d+) publica/)

    const total =
      totalMatch
        ? parseInt(totalMatch[1])
        : videos.length

    return {
      status: true,
      result: {
        keyword,
        total,
        count: videos.length,
        videos
      }
    }

  }

  app.get("/search/snackvideo", async (req, res) => {
      try {
        const { q } = req.query
        if (!q) {
          return res.status(400).json({
            status: false,
            message:
              "Falta el parámetro q"
          })
        }

        const result =
          await scrapeSnackVideo(q)

        return res.json(result)

      } catch (e) {

        return res.status(500).json({
          status: false,
          message: e.message
        })

      }

    }
  )

}