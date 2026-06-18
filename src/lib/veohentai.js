const fetch = require("node-fetch")
const cheerio = require("cheerio")
const { JSDOM } = require("jsdom")

async function searchHentai(query) {
  if (!query) throw new Error("Falta el parámetro query")

  const url = `https://veohentai.com/?s=${encodeURIComponent(query)}`

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  })

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)

  const results = []

  $(".grid a").each((i, el) => {
    const videoUrl = $(el).attr("href")
    const title = $(el).find("h2").text().trim()

    if (videoUrl && title) {
      results.push({
        title,
        url: videoUrl
      })
    }
  })

  return {
    status: true,
    total: results.length,
    data: results
  }
}

async function hentaiDetail(url) {
  if (!url) throw new Error("Falta el parámetro url")

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  })

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}`)
  }

  const html = await response.text()

  const dom = new JSDOM(html)
  const document = dom.window.document

  const iframe = document.querySelector(".aspect-w-16.aspect-h-9 iframe")

  if (!iframe) {
    throw new Error("Iframe no encontrado")
  }

  const iframeSrc = iframe.src

  const iframeResponse = await fetch(iframeSrc, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  })

  const iframeHtml = await iframeResponse.text()

  const match = iframeHtml.match(/data-id="\/player\.php\?u=([^&]*)/)

  if (!match) {
    throw new Error("No se encontró el video")
  }

  const videoUrl = atob(match[1])

  const title =
    document.querySelector("h1.text-whitegray.text-lg")?.textContent.trim() ||
    "Sin título"

  const views =
    document.querySelector("h4.text-whitelite.text-sm")?.textContent.trim() ||
    "0"

  const likes =
    document.querySelector("#num-like")?.textContent.trim() ||
    "0"

  const dislikes =
    document.querySelector("#num-dislike")?.textContent.trim() ||
    "0"

  const size = await getSize(videoUrl)

  return {
    status: true,
    data: {
      title,
      views,
      likes,
      dislikes,
      size,
      video_url: videoUrl
    }
  }
}

async function getSize(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD"
    })

    const bytes = parseInt(res.headers.get("content-length"))

    if (!bytes) return "Unknown"

    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + " GB"
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + " MB"
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + " KB"

    return bytes + " B"
  } catch {
    return "Unknown"
  }
}

module.exports = {
  searchHentai,
  hentaiDetail
}