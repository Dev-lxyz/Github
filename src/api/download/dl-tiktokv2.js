module.exports = function (app) {
  const axios = require("axios")

  // ─── Helpers ────────────────────────────────────────────────
  const formatNumber = (num) =>
    new Intl.NumberFormat("de-DE").format(Number(num) || 0)

  const formatDuration = (sec) => {
    if (!sec) return "0:00"
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const formatDateTime = (timestamp) => {
    if (!timestamp) return ""
    return new Date(timestamp * 1000)
      .toLocaleString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
      .replace(",", "")
      .replace(/^\w/, (c) => c.toUpperCase())
  }

  // ─── Clase TikTok Scraper ────────────────────────────────────
  class TikTok {
    constructor() {
      this.site = "https://www.tiktok.com"
      this.ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      this.apiParams =
        "aid=1988&app_language=en&app_name=tiktok_web&browser_language=en-US&browser_name=Mozilla&browser_online=true&browser_platform=Win32&channel=tiktok_web&cookie_enabled=true&device_platform=web_pc&focus_state=true&from_page=fyp&is_fullscreen=false&is_page_visible=true&language=en&os=windows&region=US&screen_height=1080&screen_width=1920&tz_name=America/New_York&user_is_login=false&webcast_language=en"
      this.cookies = {}
    }

    // ─── Request con axios ───────────────────────────────────
    async request(url, referer = `${this.site}/en/`) {
      // Serializar cookies guardadas
      const cookieStr = Object.entries(this.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ")

      const res = await axios.get(url, {
        timeout: 60000,
        maxRedirects: 5,
        headers: {
          "User-Agent": this.ua,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          Referer: referer,
          Connection: "keep-alive",
          ...(cookieStr && { Cookie: cookieStr }),
        },
        // Para recibir las Set-Cookie de la respuesta
        withCredentials: true,
      })

      // Guardar cookies que devuelva TikTok
      const setCookie = res.headers["set-cookie"]
      if (setCookie) {
        for (const cookie of setCookie) {
          const [pair] = cookie.split(";")
          const [key, val] = pair.split("=")
          if (key && val) this.cookies[key.trim()] = val.trim()
        }
      }

      return { status: res.status, text: typeof res.data === "string" ? res.data : JSON.stringify(res.data) }
    }

    // ─── Scrape principal ────────────────────────────────────
    async scrape(input, type = "video") {
      try {
        type = String(type).toLowerCase().trim()
        if (!["video", "audio", "image", "feed"].includes(type))
          throw new Error("type debe ser: video, audio, image o feed")

        const raw = this.clean(input)
        if (!raw || type === "feed" || this.lower(raw) === "feed")
          return this.scrapeFeed()

        const item = await this.fetchItem(raw)
        const medias = this.extractMedias(item)

        // Post de imágenes
        if (type === "image" || item?.imagePost)
          return this.buildImageResponse(item)

        const filtered = medias.filter((m) =>
          type === "audio" ? this.isAudio(m) : this.isVideo(m)
        )

        if (!filtered.length)
          throw new Error(`No se encontraron formatos de ${type}`)

        const best = this.pickBest(filtered, type)
        const mapped = this.mapItem(item)

        return {
          status: true,
          type,
          title: mapped.description || "tiktok",
          source: raw,
          date: formatDateTime(item?.createTime),
          duration: formatDuration(item?.video?.duration),
          region: item?.locationCreated || "",
          thumbnail: mapped.thumbnail,
          cover: item?.video?.cover || null,
          dynamicCover: item?.video?.dynamicCover || null,
          author: {
            username: mapped.author.uniqueId || "",
            name: mapped.author.nickname || "",
            avatar: item?.author?.avatarLarger || item?.author?.avatarThumb || "",
          },
          stats: {
            status: best?.url ? "Available" : "Not Available",
            likes: formatNumber(mapped.stats.likes),
            comments: formatNumber(mapped.stats.comments),
            shares: formatNumber(mapped.stats.shares),
            views: formatNumber(mapped.stats.views),
            favorites: formatNumber(item?.stats?.collectCount || item?.statsV2?.collectCount || 0),
            downloads: formatNumber(item?.stats?.downloadCount || item?.statsV2?.downloadCount || 0),
          },
          link: mapped.url,
          audio: item?.music
            ? {
                title: item.music.title || "",
                author: item.music.authorName || "",
                cover: item.music.coverLarge || item.music.coverThumb || "",
                url: item.music.playUrl || null,
                duration: formatDuration(item.music.duration),
              }
            : null,
          download: this.format(best),
          formats: filtered.map((m) => this.format(m)),
        }
      } catch (e) {
        return { status: false, message: e instanceof Error ? e.message : String(e) }
      }
    }

    buildImageResponse(item) {
      const mapped = this.mapItem(item)
      const images =
        item?.imagePost?.images?.map((img) => ({
          url: img?.imageURL?.urlList?.[0] || null,
          width: img?.imageWidth || null,
          height: img?.imageHeight || null,
        })) || []

      return {
        status: true,
        type: "image",
        title: mapped.description || "tiktok",
        date: formatDateTime(item?.createTime),
        region: item?.locationCreated || "",
        author: {
          username: mapped.author.uniqueId || "",
          name: mapped.author.nickname || "",
          avatar: item?.author?.avatarLarger || item?.author?.avatarThumb || "",
        },
        stats: {
          status: images.length ? "Available" : "Not Available",
          likes: formatNumber(mapped.stats.likes),
          comments: formatNumber(mapped.stats.comments),
          shares: formatNumber(mapped.stats.shares),
          views: formatNumber(mapped.stats.views),
          favorites: formatNumber(item?.stats?.collectCount || item?.statsV2?.collectCount || 0),
          downloads: formatNumber(item?.stats?.downloadCount || item?.statsV2?.downloadCount || 0),
        },
        link: mapped.url,
        audio: item?.music
          ? {
              title: item.music.title || "",
              author: item.music.authorName || "",
              cover: item.music.coverLarge || item.music.coverThumb || "",
              url: item.music.playUrl || null,
              duration: formatDuration(item.music.duration),
            }
          : null,
        images,
        total: images.length,
      }
    }

    async scrapeFeed() {
      const { status, text } = await this.request(
        `${this.site}/api/preload/item_list/?${this.apiParams}&count=5&video_encoding=mp4`
      )
      if (status !== 200) throw new Error(`Feed HTTP ${status}`)

      const data = this.json(text)
      if (!data?.itemList?.length) throw new Error("Feed vacío")

      return {
        status: true,
        type: "feed",
        total: data.itemList.length,
        items: data.itemList.map((item) => {
          const mapped = this.mapItem(item)
          const isImage = !!item?.imagePost
          const medias = this.extractMedias(item)
          const best = isImage
            ? null
            : this.pickBest(medias.filter((m) => this.isVideo(m)), "video")

          return {
            id: mapped.id,
            type: isImage ? "image" : "video",
            title: mapped.description || "",
            date: formatDateTime(item?.createTime),
            thumbnail: mapped.thumbnail,
            author: {
              username: mapped.author.uniqueId || "",
              name: mapped.author.nickname || "",
            },
            stats: {
              likes: formatNumber(mapped.stats.likes),
              comments: formatNumber(mapped.stats.comments),
              shares: formatNumber(mapped.stats.shares),
              views: formatNumber(mapped.stats.views),
              favorites: formatNumber(item?.stats?.collectCount || 0),
              downloads: formatNumber(item?.stats?.downloadCount || 0),
            },
            link: mapped.url,
            download: best ? this.format(best) : null,
            images: isImage
              ? (item.imagePost.images || []).map((img) => ({
                  url: img?.imageURL?.urlList?.[0] || null,
                  width: img?.imageWidth || null,
                  height: img?.imageHeight || null,
                }))
              : [],
          }
        }),
      }
    }

    async fetchItem(input) {
      let url = this.clean(input)
      if (/^\d{15,25}$/.test(url)) url = `${this.site}/@/video/${url}`
      else if (!url.startsWith("http")) url = `https://${url}`

      const { status, text } = await this.request(url, this.site)
      if (status !== 200) throw new Error(`HTTP ${status}`)

      const item = this.parseHtml(text)
      if (!item) throw new Error("Sin metadatos — el video puede ser privado o no existir")
      return item
    }

    parseHtml(html) {
      return (
        this.json(
          html.match(
            /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/i
          )?.[1]
        )?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct || null
      )
    }

    mapItem(item) {
      const s = item?.stats || item?.statsV2 || {}
      const a = item?.author || {}
      const id = String(item?.id || "")
      return {
        id,
        url: `${this.site}/@${a.uniqueId || "user"}/video/${id}`,
        description: this.clean(item?.desc),
        thumbnail:
          item?.video?.cover ||
          item?.video?.dynamicCover ||
          item?.video?.originCover ||
          item?.imagePost?.images?.[0]?.imageURL?.urlList?.[0] ||
          null,
        author: { uniqueId: a.uniqueId || null, nickname: a.nickname || null },
        stats: {
          likes: this.num(s.diggCount),
          comments: this.num(s.commentCount),
          shares: this.num(s.shareCount),
          views: this.num(s.playCount),
        },
      }
    }

    extractMedias(item) {
      const v = item?.video || {}
      const out = []
      const push = (url, extra = {}) =>
        url && out.push({ url, type: "video", ext: "mp4", ...extra })

      push(v.playAddr, { quality: "play" })
      push(v.downloadAddr, { quality: "download" })

      for (const b of v.bitrateInfo || []) {
        push(b.PlayAddr?.UrlList?.[0] || b.playAddr, {
          quality: b.GearName || b.QualityType || null,
          bitrate: b.Bitrate,
          width: b.Width,
          height: b.Height,
        })
      }

      if (item?.music?.playUrl) {
        out.push({
          url: item.music.playUrl,
          type: "audio",
          ext: "mp3",
          quality: "music",
          bitrate: null,
        })
      }

      return out
    }

    isAudio(m = {}) {
      return (
        this.lower(m.type) === "audio" ||
        ["mp3", "m4a", "aac"].includes(this.lower(m.ext))
      )
    }

    isVideo(m = {}) {
      return (
        this.lower(m.type) === "video" ||
        ["mp4", "webm"].includes(this.lower(m.ext))
      )
    }

    pickBest(list = [], type = "video") {
      return (
        [...list].sort((a, b) =>
          type === "audio"
            ? this.num(b.bitrate) - this.num(a.bitrate)
            : this.num(b.height) - this.num(a.height) ||
              this.num(b.bitrate) - this.num(a.bitrate)
        )[0] || null
      )
    }

    format(m = {}) {
      return {
        url: m.url || null,
        type: m.type || null,
        ext: m.ext || null,
        quality: m.quality || null,
        height: m.height || null,
        width: m.width || null,
        bitrate: m.bitrate || null,
      }
    }

    json(text) {
      try {
        return JSON.parse(text || "{}")
      } catch {
        return null
      }
    }

    clean(v) {
      const t = String(v ?? "").trim()
      return t || null
    }

    lower(v) {
      return String(v || "").toLowerCase().trim()
    }

    num(v) {
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    }
  }

  // ─── Instancia única ─────────────────────────────────────────
  const tiktok = new TikTok()

  // ─── Endpoint ────────────────────────────────────────────────
  app.get("/download/tiktok/v2", async (req, res) => {
    try {
      const { url, type = "video" } = req.query

      if (!url)
        return res.json({
          status: false,
          message: "Falta el parámetro 'url'",
        })

      const result = await tiktok.scrape(url, type)
      return res.json(result)
    } catch (error) {
      console.error("[TikTok]", error)
      return res.json({
        status: false,
        message: "Error interno al procesar la solicitud",
      })
    }
  })
}