const axios = require("axios")

class FlowVideoDownloader {
  constructor() {
    this.cookies = {}
    this.csrfToken = null

    this.client = axios.create({
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
        "accept": "application/json",
        "referer": "https://flowvideoplayer.com/",
        "origin": "https://flowvideoplayer.com",
      }
    })
  }

  async getCredentials() {
    const home = await this.client.get("https://flowvideoplayer.com/")

    if (home.headers["set-cookie"]) {
      home.headers["set-cookie"].forEach(cookie => {
        const [pair] = cookie.split(";")
        const [key, val] = pair.split("=")
        if (key && val) this.cookies[key] = val
      })
    }

    const html = home.data

    const tokenMatch =
      html.match(/name="csrf-token" content="([^"]+)"/) ||
      html.match(/meta.*csrf-token.*content="([^"]+)"/i) ||
      html.match(/_token\s*=\s*'([^']+)'/) ||
      html.match(/XSRF-TOKEN[^=]+=([^&;]+)/)

    if (tokenMatch) {
      this.csrfToken = tokenMatch[1]
    } else if (this.cookies["XSRF-TOKEN"]) {
      this.csrfToken = decodeURIComponent(this.cookies["XSRF-TOKEN"])
    }

    return {
      cookies: this.cookies,
      csrfToken: this.csrfToken
    }
  }

  async search(teraboxUrl) {
    if (!teraboxUrl) {
      throw new Error("URL is required")
    }

    await this.getCredentials()

    if (!this.csrfToken) {
      throw new Error("Failed to get CSRF token")
    }

    const cookieStr = Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ")

    const res = await this.client.post(
      "https://flowvideoplayer.com/telegram/bot/search/video",
      { url: teraboxUrl },
      {
        headers: {
          cookie: cookieStr,
          "x-csrf-token": this.csrfToken,
          "x-xsrf-token": this.csrfToken,
          "content-type": "application/json",
          accept: "application/json",
          referer: "https://flowvideoplayer.com/",
        }
      }
    )

    return this.formatResponse(res.data)
  }

  formatResponse(data) {
    if (!data || data.error !== false || !data.data) {
      return {
        status: false,
        message: "No files found or request failed",
        raw: data
      }
    }

    const files = data.data.map(file => ({
      name: file.file_name,
      size: file.file_size,
      size_bytes: file.file_size_bytes,
      extension: file.extension,
      duration: file.duration || "00:00",
      download_url: file.download_url,
      share_url: file.share_url
    }))

    return {
      status: true,
      total: files.length,
      files
    }
  }
}

module.exports = {
  FlowVideoDownloader
}