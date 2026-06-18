const axios = require("axios")

module.exports = function (app) {
  app.get("/search/github", async (req, res) => {
    try {
      const { q, limit = 50 } = req.query

      if (!q) {
        return res.status(400).json({
          status: false,
          error: "Query 'q' is required"
        })
      }

      const l = Math.min(limit ? parseInt(limit) : 5, 100)

      const { data } = await axios.get(
        "https://api.github.com/search/repositories",
        {
          params: {
            q,
            per_page: l,
            sort: "updated",
            order: "desc"
          },
          headers: {
            "User-Agent": "shadow-api"
          }
        }
      )

      const results = data.items.map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        url: repo.html_url,
        created_at: repo.created_at,
        updated_at: repo.updated_at
      }))

      res.json({
        status: true,
        total: data.total_count,
        results
      })
    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      })
    }
  })
}