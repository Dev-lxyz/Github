const fetch = require('node-fetch');

module.exports = function(app) {

  async function Roblox(username) {
    const search = await fetch(`https://users.roblox.com/v1/users/search?keyword=${username}&limit=10`);
    const searchJson = await search.json();

    if (!searchJson.data || !searchJson.data.length) {
      return { error: "User no encontrado" };
    }

    const user = searchJson.data[0];
    const userId = user.id;

    const [
      detail,
      avatar,
      followers,
      following,
      friends,
      groups,
      games,
      badges,
      inventory
    ] = await Promise.all([
      fetch(`https://users.roblox.com/v1/users/${userId}`).then(r => r.json()),
      fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png`).then(r => r.json()),
      fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`).then(r => r.json()),
      fetch(`https://friends.roblox.com/v1/users/${userId}/followings/count`).then(r => r.json()),
      fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`).then(r => r.json()),
      fetch(`https://groups.roblox.com/v2/users/${userId}/groups/roles`).then(r => r.json()),
      fetch(`https://games.roblox.com/v2/users/${userId}/games?limit=50`).then(r => r.json()),
      fetch(`https://badges.roblox.com/v1/users/${userId}/badges?limit=50`).then(r => r.json()),
      fetch(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=50`)
        .then(r => r.json())
        .catch(() => null)
    ]);

    let presence = null;
    try {
      const pres = await fetch(`https://presence.roblox.com/v1/presence/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userId] })
      });
      const presJson = await pres.json();
      presence = presJson.userPresences?.[0] || null;
    } catch {}

    return {
      id: detail.id,
      username: detail.name,
      displayName: detail.displayName,
      description: detail.description,
      created: detail.created,
      verified: user.hasVerifiedBadge,
      avatar: avatar.data?.[0]?.imageUrl || null,
      social: {
        followers: followers.count,
        following: following.count,
        friends: friends.count
      },
      presence,
      groups: groups.data || [],
      games: games.data || [],
      badges: badges.data || [],
      inventory: inventory?.data || null
    };
  }

  app.get('/stalk/roblox', async (req, res) => {
    try {
      const { user } = req.query;

      if (!user) {
        return res.json({
          status: false,
          error: "Falta ?user="
        });
      }

      const result = await Roblox(user);

      if (result.error) {
        return res.json({
          status: false,
          error: result.error
        });
      }

      res.json({
        status: true,
        result
      });

    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      });
    }
  });

};