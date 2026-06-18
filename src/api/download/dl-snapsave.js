module.exports = function (app) {

  const CHARMAP = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/"

  function _0xe93c(d, e, f) {
    const g = CHARMAP.split('')
    const h = g.slice(0, e)
    const i = g.slice(0, f)

    let j = d.split('').reverse().reduce((a,b,c)=>{
      if(h.indexOf(b)!==-1)
        return a += h.indexOf(b) * Math.pow(e,c)
    },0)

    let k = ""

    while(j > 0){
      k = i[j % f] + k
      j = (j - (j % f)) / f
    }

    return k || "0"
  }


  function escRegex(s){
    return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  }


  function decode(encoded,n,t,e){
    let result=""
    let i=0
    const sep=n[e]
    while(i < encoded.length){
      let s=""
      while(i < encoded.length && encoded[i] !== sep){
        s += encoded[i]
        i++
      }

      i++

      for(let j=0;j<n.length;j++)
        s=s.replace(new RegExp(escRegex(n[j]),"g"),j)

      result += String.fromCharCode(
        parseInt(_0xe93c(s,e,10))-t
      )
    }

    return decodeURIComponent(escape(result))
  }

  function extractParams(body){

    const m = body.match(
      /\("([^"]+)",\s*(\d+),\s*"([A-Za-z]+)",\s*(\d+),\s*(\d+),\s*(\d+)\)\)/
    )

    if(!m) return null

    return {
      encoded:m[1],
      n:m[3],
      t:parseInt(m[4]),
      e:parseInt(m[5]),
      r:parseInt(m[6])
    }

  }

  async function snapsave(url,type="instagram"){
    const base="https://snapsave.app"
    const headers={
      "User-Agent":
      "Mozilla/5.0",
      "Referer":
      `${base}/download-video-${type}`,
      "Origin":base
    }

    const page = await fetch(
      `${base}/download-video-${type}`,
      {
        headers
      }
    )

    const cookies =
      page.headers.getSetCookie
      ? page.headers.getSetCookie()
      .map(c=>c.split(";")[0])
      .join("; ")
      : ""

    const form = new URLSearchParams()
    form.set("url",url)
    const res = await fetch(
      `${base}/action.php?lang=en`,
      {
        method:"POST",
        headers:{
          ...headers,
          "Content-Type":
          "application/x-www-form-urlencoded",
          "X-Requested-With":
          "XMLHttpRequest",
          Cookie:cookies
        },
        body:form
      }
    )

    const body = await res.text()
    const params = extractParams(body)

    if(!params)
      throw new Error(
        "No se pudo extraer datos"
      )


    const decoded = decode(
      params.encoded,
      params.n,
      params.t,
      params.e
    )
    const urls=[
      ...new Set(
        [...decoded.matchAll(
          /https?:\/\/d\.rapidcdn\.app\/v2\?token=[^"'\s\\]+/g
        )]
        .map(x=>x[0])
      )
    ]

    if(!urls.length)
      throw new Error(
        "No se encontró descarga"
      )
    const downloads = urls.map(u=>{
      let info={
        type:"unknown",
        filename:null,
        originalUrl:null
      }

      try{
        const token=u.match(/token=([^&]+)/)[1]
        const payload =
        JSON.parse(
          Buffer.from(
            token.split(".")[1],
            "base64url"
          ).toString()
        )

        info={
          filename:payload.filename || null,
          originalUrl:payload.url || null,
          type:
          payload.filename?.endsWith(".mp4")
          ? "video"
          :"image"
        }
      }catch{}
      return {
        downloadUrl:u,
        ...info
      }
    })

    return {
      status:true,
      type,
      source:url,
      count:downloads.length,
      downloads
    }

  }

  app.get("/download/snapsave", async(req,res)=>{
    try{
      const {
        url,
        type="instagram"
      } = req.query
      if(!url)
        return res.json({
          status:false,
          error:"Falta ?url="
        })



      if(!["instagram","facebook"].includes(type))
        return res.json({
          status:false,
          error:"type solo acepta instagram o facebook"
        })



      const result = await snapsave(
        url,
        type
      )
      res.json(result)

    }catch(e){

      res.json({
        status:false,
        error:e.message
      })

    }

  })

}