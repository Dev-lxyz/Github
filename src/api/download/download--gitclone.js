const axios = require("axios")

const GITHUB_REGEX = /^(?:https:\/\/|git@)github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/i

function formatDate(date) {
  return new Date(date).toLocaleString("es-ES")
}

module.exports = function (app) {

  app.get("/download/gitclone", async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          error: "Falta parámetro: url"
        })
      }

      const headers = {
        "User-Agent": "GitClone-API",
        "Accept": "application/vnd.github+json"
      }

      let repos = []

      const match = url.match(GITHUB_REGEX)
      if (match) {
        const [, user, repo] = match

        const { data } = await axios.get(
          `https://api.github.com/repos/${user}/${repo}`,
          { headers }
        )

        repos.push(data)

      } else {
        const { data } = await axios.get(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(url)}`,
          { headers }
        )

        if (!data.items || !data.items.length) {
          return res.json({
            status: false,
            error: "No se encontraron repositorios"
          })
        }

        repos = data.items.slice(0, 5)
      }

      const results = []

      for (const r of repos) {

        let languages = []
        try {
          const langRes = await axios.get(r.languages_url, { headers })
          languages = Object.keys(langRes.data)
        } catch {}

        let lastCommit = null
        try {
          const { data } = await axios.get(
            `https://api.github.com/repos/${r.owner.login}/${r.name}/commits?per_page=1`,
            { headers }
          )

          if (data[0]) {
            lastCommit = {
              message: data[0].commit.message,
              author: data[0].commit.author.name,
              date: data[0].commit.author.date,
              url: data[0].html_url
            }
          }
        } catch {}

        // 🔥 NUEVO: tamaño en MB
        const sizeMB = r.size ? (r.size / 1024).toFixed(2) : "0.00"

        results.push({
          full_name: r.full_name,
          name: r.name,
          description: r.description || "-",
          id: r.id,

          owner: {
            username: r.owner.login,
            id: r.owner.id,
            avatar: r.owner.avatar_url,
            profile: r.owner.html_url
          },

          private: r.private,
          fork: r.fork,
          archived: r.archived,

          created: formatDate(r.created_at),
          updated: formatDate(r.updated_at),
          pushed: formatDate(r.pushed_at),

          main_language: r.language || "-",
          languages,

          stats: {
            stars: r.stargazers_count,
            forks: r.forks_count,
            watchers: r.watchers_count,
            issues: r.open_issues_count
          },

          urls: {
            repo: r.html_url,
            homepage: r.homepage || null
          },

          clone: {
            https: r.clone_url,
            ssh: r.ssh_url,
            git: r.git_url
          },

          download: {
            zip: `https://api.github.com/repos/${r.owner.login}/${r.name}/zipball`,
            tar: `https://api.github.com/repos/${r.owner.login}/${r.name}/tarball`
          },

          license: r.license?.name || "No license",

          last_commit: lastCommit,

          // 🔥 agregado
          size: `${sizeMB} MB`
        })
      }

      res.json({
        status: true,
        count: results.length,
        results
      })

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.response?.data?.message || e.message
      })
    }
  })

}