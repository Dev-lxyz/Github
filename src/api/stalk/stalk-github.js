const axios = require("axios")

module.exports = function (app) {

  app.get("/stalk/github", async (req, res) => {
    const { user } = req.query

    if (!user) {
      return res.status(400).json({
        status: false,
        error: "Query 'user' es requerida"
      })
    }

    try {
      const { data } = await axios.get(
        `https://api.github.com/users/${encodeURIComponent(user)}`,
        {
          headers: {
            "user-agent": "HydroMind",
            "accept": "application/vnd.github+json"
          },
          timeout: 5000
        }
      )

      res.json({
        status: true,
        data: {
          username: data.login,
          id: data.id,
          name: data.name,
          bio: data.bio,
          avatar: data.avatar_url,
          profile: data.html_url,

          stats: {
            followers: data.followers,
            following: data.following,
            public_repos: data.public_repos,
            public_gists: data.public_gists
          },

          info: {
            company: data.company,
            blog: data.blog || null,
            location: data.location,
            email: data.email,
            twitter: data.twitter_username,
            hireable: data.hireable
          },

          dates: {
            created_at: data.created_at,
            updated_at: data.updated_at
          }
        }
      })

    } catch (err) {
      res.status(404).json({
        status: false,
        error: "Usuario no encontrado"
      })
    }
  })

}