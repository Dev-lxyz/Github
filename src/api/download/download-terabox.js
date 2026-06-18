const axios = require("axios")
const { FlowVideoDownloader } = require("../../lib/terabox")

module.exports = function (app) {

  app.get("/download/terabox", async (req, res) => {
    try {

      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Falta parámetro ?url="
        })
      }

      const downloader = new FlowVideoDownloader()

      const result = await downloader.search(url)

      if (!result || result.status === false) {
        return res.status(500).json({
          status: false,
          message: "Failed to fetch data",
          raw: result
        })
      }

      return res.json({
        status: true,
        total: result.total,
        result: result.files
      })

    } catch (e) {
      return res.status(500).json({
        status: false,
        message: e.message
      })
    }
  })

}


/*
scraper 

https://gist.github.com/Raflixyz/b1ccd75f54e6de6d5106009f20e70c77

*/