/**
 * @project    : Facebook Video Downloader
 * @author     : Kayllano Aveline 👨‍💻
 * @license    : MIT / Personal
 * @description: Powered by AliciaCode - Web Scraping Specialist 
 * Website     : xalixia.biz.id
 **/

const axios = require("axios")
const cheerio = require("cheerio")

async function fbDownload(videoUrl) {
  if (!videoUrl) throw Error("URL cannot be empty")

  const headers = {
    "accept": "*/*",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "application/x-www-form-urlencoded",
    "hx-current-url": "https://fget.io/",
    "hx-request": "true",
    "hx-target": "target",
    "hx-trigger": "form",
    "origin": "https://fget.io",
    "referer": "https://fget.io/",
    "user-agent":
      "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"
  }

  const body = new URLSearchParams()
  body.append("id", videoUrl)
  body.append("locale", "en")

  const res = await axios.post(
    "https://fget.io/process",
    body.toString(),
    { headers }
  )

  const $ = cheerio.load(res.data)

  const thumbnail = $(".result-thumbnail img").attr("src") || null
  const title = $(".result-title").text().trim() || "Facebook Video"

  const downloads = []

  $("a.download-result").each((i, el) => {
    const href = $(el).attr("href")
    const filename = $(el).attr("download") || null
    const isHD = $(el).hasClass("hd")
    const isSD = $(el).hasClass("sd")
    const isMP3 = $(el).hasClass("mp3")
    const dataId = $(el).attr("data-id") || null

    let quality = ""
    if (isHD) quality = "HD (720p)"
    else if (isSD) quality = "SD (360p)"
    else if (isMP3) quality = "MP3 Audio"

    if (href) {
      downloads.push({
        quality,
        type: isMP3 ? "audio" : "video",
        url: href,
        filename,
        data_id: dataId
      })
    }
  })

  const videoHD = downloads.find(d => d.quality === "HD (720p)") || null
  const videoSD = downloads.find(d => d.quality === "SD (360p)") || null
  const audioMP3 = downloads.find(d => d.quality === "MP3 Audio") || null

  return {
    code: 200,
    timestamp: Date.now(),
    data: {
      title,
      thumbnail,
      downloads: {
        hd: videoHD?.url || null,
        sd: videoSD?.url || null,
        mp3: audioMP3?.url || null
      },
      all_downloads: downloads
    }
  }
}

module.exports = {
  fbDownload
}