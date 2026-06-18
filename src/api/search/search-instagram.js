const axios = require("axios")

module.exports = function (app) {
  async function reelsSearch(query, num = 10) {
    try {
      const cx = "e500c3a7a523b49df"
      const ins = axios.create({
        headers: {
          "user-agent": "Mozilla/5.0 (Linux; Android 16; SM-F966B Build) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          "x-client-data": "CJDjygE="
        },
        timeout: 30000
      })

      const { data: init } = await ins.get(
        "https://cse.google.com/cse.js",
        {
          params: { cx }
        }
      )

      const cfg_ = init.match(/}\)\(({[\s\S]*?})\);/)

      if (!cfg_ || !cfg_[1]) {
        throw new Error("No se pudo obtener la configuración")
      }

      const cfg = JSON.parse(cfg_[1])

      const params = {
        rsz: "filtered_cse",
        num,
        hl: "es",
        source: "gcsc",
        cselibv: cfg.cselibVersion,
        cx,
        q: query,
        safe: "off",
        cse_tok: cfg.cse_token,
        lr: "",
        cr: "",
        gl: "pe",
        filter: 0,
        sort: "",
        as_oq: "",
        as_sitesearch: "",
        exp: "cc,apo",
        oq: "",
        callback: "google.search.cse.api11171",
        rurl: Buffer.from(
          "aHR0cHM6Ly9yZWVsc2ZpbmRlci5zYXRpc2h5YWRhdi5jb20v",
          "base64"
        ).toString()
      }

      const response = await ins.get(
        "https://cse.google.com/cse/element/v1",
        { params }
      )

      const raw = response.data

      const jsonStartIndex = raw.indexOf("{")
      const jsonEndIndex = raw.lastIndexOf("}")

      const jsonString = raw.slice(
        jsonStartIndex,
        jsonEndIndex + 1
      )

      const jsonData = JSON.parse(jsonString)

      return (jsonData.results || []).map(item => ({
        title: item.richSnippet?.metatags?.ogTitle || "",
        description: item.richSnippet?.metatags?.ogDescription || "",
        url: item.url || "",
        image: item.richSnippet?.metatags?.ogImage || ""
      }))

    } catch (e) {
      throw e
    }
  }

  app.get("/search/reels", async (req, res) => {
    try {
      const {
        q,
        num = 10
      } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Falta el parámetro q"
        })
      }

      const result = await reelsSearch(q, Number(num))

      return res.json({
        status: true,
        total: result.length,
        result
      })

    } catch (e) {

      return res.status(500).json({
        status: false,
        message: e.message
      })

    }
  })

}