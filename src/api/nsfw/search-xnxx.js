module.exports = function (app) {
  const fetch = require("node-fetch")
  const cheerio = require("cheerio")

  // Sin parámetros extra, recibe ?q=
  app.get("/nsfw/search/xnxx", async (req, res) => {
    try {
      const query = req.query.q
      if (!query) {
        return res.status(400).json({
          status: false,
          error: "Falta el parámetro 'q' (búsqueda)"
        })
      }

      const data = await xnxxsearch(query)

      if (!data.status || !data.result?.length) {
        return res.status(404).json({
          status: false,
          error: "No se encontraron resultados"
        })
      }

      // Mapear resultado para JSON limpio
      const result = data.result.map((v, i) => ({
        no: i + 1,
        title: v.title,
        info: v.info,
        url: v.link
      }))

      res.json({
        status: true,
        query,
        result,
        total: result.length
      })
    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })

  async function xnxxsearch(query) {
    return new Promise((resolve, reject) => {
      const baseurl = "https://www.xnxx.com"
      const page = Math.floor(Math.random() * 3) + 1

      fetch(`${baseurl}/search/${encodeURIComponent(query)}/${page}`, {
        method: "get",
        headers: { "User-Agent": "Mozilla/5.0" }
      })
        .then((res) => res.text())
        .then((res) => {
          const $ = cheerio.load(res, { xmlMode: false })
          const title = []
          const url = []
          const desc = []
          const results = []

          $("div.mozaique").each(function (_, b) {
            $(b)
              .find("div.thumb")
              .each(function (_, d) {
                let href = $(d).find("a").attr("href") || ""
                if (href.includes("/THUMBNUM/")) href = href.replace("/THUMBNUM/", "/")
                url.push(baseurl + href)
              })
          })

          $("div.mozaique").each(function (_, b) {
            $(b)
              .find("div.thumb-under")
              .each(function (_, d) {
                desc.push($(d).find("p.metadata").text())
                $(d)
                  .find("a")
                  .each(function (_, f) {
                    title.push($(f).attr("title"))
                  })
              })
          })

          for (let i = 0; i < title.length; i++) {
            results.push({ title: title[i], info: desc[i], link: url[i] })
          }

          resolve({ code: 200, status: true, result: results })
        })
        .catch((err) => reject({ code: 503, status: false, result: err }))
    })
  }
}