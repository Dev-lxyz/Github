
const axios = require("axios")
const fs = require("fs")
const path = require("path")

async function downloadImage(url, filepath) {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream"
  })

  const writer = fs.createWriteStream(filepath)
  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve)
    writer.on("error", reject)
  })
}

async function removeBg(imagePath) {
  try {
    const homeRes = await axios.get("https://www.remove.bg/id/upload", {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36"
      }
    })

    const cookies = homeRes.headers["set-cookie"] || []
    let sessionCookie = ""

    for (const cookie of cookies) {
      if (cookie.includes("_remove_bg_session=")) {
        sessionCookie = cookie.split(";")[0]
        break
      }
    }

    const html = homeRes.data

    const csrfMatch = html.match(/name="csrf-token" content="([^"]+)"/)

    const csrfToken = csrfMatch
      ? csrfMatch[1]
      : "Mf7aty8Ob7OZcMSYD8jT0fWW_yaMbhFNytxMbM8eWdPYoqBYLeX2DFPTvvlaIoleFzTmGWdzrDVsy5iMDCdZ1g"

    const baseCookie = `consent=eyJpcCI6IjIwMi42NS4yMjUuMjUxIiwib3JpZ2luIjoicmVtb3ZlLmJnIiwiY291bnRyeSI6IklEIiwidGltZXN0YW1wIjoxNzc4MjkzNjI1ODc1LCJvcHRpb25zIjpbIm1hbmFnZWQiLCJmdW5jdGlvbmFsIiwicGVyZm9ybWFuY2UiLCJ0YXJnZXRpbmciXSwiY29uc2VudCI6eyJtYW5hZ2VkIjp0cnVlLCJmdW5jdGlvbmFsIjp0cnVlLCJwZXJmb3JtYW5jZSI6dHJ1ZSwidGFyZ2V0aW5nIjp0cnVlfSwiY29va2llUG9saWN5VmVyc2lvbiI6IjIwMjUtMDgtMDQifQ==; _sp_ses.8a92=*; ${sessionCookie}; _sp_id.8a92=e705fa54-906b-431a-93db-1abcf7eeac8d.1778293626.2.1778675418.1778293637.124e041b-de48-4325-a5a4-6da80aa3932a.6ec97772-c9b6-42e3-90ab-757bdb538269.f10e3dc4-56b9-4519-8e45-ff4d12a06b56.1778675102193.4`

    const tokenRes = await axios.post(
      "https://www.remove.bg/trust_tokens",
      {},
      {
        headers: {
          accept: "*/*",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "no-cache",
          cookie: baseCookie,
          origin: "https://www.remove.bg",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://www.remove.bg/id/upload",
          "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
          "x-csrf-token": csrfToken,
          "x-requested-with": "XMLHttpRequest",
          "content-length": "0"
        }
      }
    )

    const trustToken = tokenRes.data.request.match(/useToken\('(.*?)'\)/)[1]

    const newSessionCookie = tokenRes.headers["set-cookie"][0].split(";")[0]

    const imageBuffer = fs.readFileSync(imagePath)

    const boundary = "----WebKitFormBoundaryedpPkz6YLRRN2IDf"

    const parts = []

    parts.push(Buffer.from(`--${boundary}\r\n`))
    parts.push(Buffer.from(`Content-Disposition: form-data; name="image[original]"; filename="image.jpg"\r\n`))
    parts.push(Buffer.from(`Content-Type: image/jpeg\r\n\r\n`))
    parts.push(imageBuffer)
    parts.push(Buffer.from(`\r\n`))

    parts.push(Buffer.from(`--${boundary}\r\n`))
    parts.push(Buffer.from(`Content-Disposition: form-data; name="trust_token"\r\n\r\n`))
    parts.push(Buffer.from(`${trustToken}\r\n`))

    parts.push(Buffer.from(`--${boundary}\r\n`))
    parts.push(Buffer.from(`Content-Disposition: form-data; name="new_editor"\r\n\r\n`))
    parts.push(Buffer.from(`true\r\n`))

    parts.push(Buffer.from(`--${boundary}--\r\n`))

    const bodyBuffer = Buffer.concat(parts)

    const uploadCookie = `consent=eyJpcCI6IjIwMi42NS4yMjUuMjUxIiwib3JpZ2luIjoicmVtb3ZlLmJnIiwiY291bnRyeSI6IklEIiwidGltZXN0YW1wIjoxNzc4MjkzNjI1ODc1LCJvcHRpb25zIjpbIm1hbmFnZWQiLCJmdW5jdGlvbmFsIiwicGVyZm9ybWFuY2UiLCJ0YXJnZXRpbmciXSwiY29uc2VudCI6eyJtYW5hZ2VkIjp0cnVlLCJmdW5jdGlvbmFsIjp0cnVlLCJwZXJmb3JtYW5jZSI6dHJ1ZSwidGFyZ2V0aW5nIjp0cnVlfSwiY29va2llUG9saWN5VmVyc2lvbiI6IjIwMjUtMDgtMDQifQ==; _sp_ses.8a92=*; _sp_id.8a92=e705fa54-906b-431a-93db-1abcf7eeac8d.1778293626.2.1778675418.1778293637.124e041b-de48-4325-a5a4-6da80aa3932a.6ec97772-c9b6-42e3-90ab-757bdb538269.f10e3dc4-56b9-4519-8e45-ff4d12a06b56.1778675102193.4; ${newSessionCookie}`

    const uploadRes = await axios.post(
      "https://www.remove.bg/images",
      bodyBuffer,
      {
        headers: {
          accept: "application/json",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "no-cache",
          "content-type": `multipart/form-data; boundary=${boundary}`,
          cookie: uploadCookie,
          origin: "https://www.remove.bg",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://www.remove.bg/id/upload",
          "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
          "x-csrf-token": csrfToken
        }
      }
    )

    const imageId = uploadRes.data.data[0].meta.id

    const finalCookie = uploadRes.headers["set-cookie"][0].split(";")[0]

    await new Promise(resolve => setTimeout(resolve, 6000))

    const resultCookie = `consent=eyJpcCI6IjIwMi42NS4yMjUuMjUxIiwib3JpZ2luIjoicmVtb3ZlLmJnIiwiY291bnRyeSI6IklEIiwidGltZXN0YW1wIjoxNzc4MjkzNjI1ODc1LCJvcHRpb25zIjpbIm1hbmFnZWQiLCJmdW5jdGlvbmFsIiwicGVyZm9ybWFuY2UiLCJ0YXJnZXRpbmciXSwiY29uc2VudCI6eyJtYW5hZ2VkIjp0cnVlLCJmdW5jdGlvbmFsIjp0cnVlLCJwZXJmb3JtYW5jZSI6dHJ1ZSwidGFyZ2V0aW5nIjp0cnVlfSwiY29va2llUG9saWN5VmVyc2lvbiI6IjIwMjUtMDgtMDQifQ==; _sp_ses.8a92=*; _sp_id.8a92=e705fa54-906b-431a-93db-1abcf7eeac8d.1778293626.2.1778675418.1778293637.124e041b-de48-4325-a5a4-6da80aa3932a.6ec97772-c9b6-42e3-90ab-757bdb538269.f10e3dc4-56b9-4519-8e45-ff4d12a06b56.1778675102193.4; ${finalCookie}`

    const resultRes = await axios.get(
      `https://www.remove.bg/images/inline/${imageId}`,
      {
        headers: {
          accept: "application/json",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "no-cache",
          cookie: resultCookie,
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://www.remove.bg/id/upload",
          "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
          "x-csrf-token": csrfToken
        }
      }
    )

    return {
      status: true,
      code: 200,
      result: resultRes.data
    }
  } catch (err) {
    return {
      status: false,
      code: err.response?.status || 500,
      error: err.message,
      details: err.response?.data || null
    }
  }
}

module.exports = {
  removeBg,
  downloadImage
}