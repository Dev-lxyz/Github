module.exports = function (app) {
  async function instagramStalk(user) {

    if (!user) {
      throw new Error('Username requerido')
    }

    user =
      user
        .replace(/^@/, '')
        .trim()

    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(user)}`
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-IG-App-ID': '936619743392459',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `https://www.instagram.com/${user}/`,
      'Origin': 'https://www.instagram.com',
      'Connection': 'keep-alive'
    }

    const response =
      await fetch(url, { headers })

    if (!response.ok) {

      if (response.status === 404) {
        throw new Error(`Usuario @${user} no encontrado`)
      }

      if (response.status === 429) {
        throw new Error('Rate limit de Instagram')
      }

      throw new Error(
        `HTTP ${response.status}`
      )

    }

    const json =
      await response.json()

    const igUser =
      json?.data?.user

    if (!igUser) {
      throw new Error(
        'Perfil privado o inaccesible'
      )
    }

    const latestPosts =
      (igUser.edge_owner_to_timeline_media?.edges || [])
        .slice(0, 5)
        .map(({ node }) => ({
          id: node.id,
          shortcode: node.shortcode,
          type: node.__typename,
          caption:
            node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
          likes:
            node.edge_liked_by?.count || 0,
          comments:
            node.edge_media_to_comment?.count || 0,
          timestamp:
            node.taken_at_timestamp,
          image:
            node.display_url,
          isVideo:
            node.is_video,
          video:
            node.video_url || null,
          dimensions:
            node.dimensions
        }))

    return {
      username: igUser.username,
      fullName: igUser.full_name || '',
      biography: igUser.biography || '',
      verified: igUser.is_verified,
      private:  igUser.is_private,
      followers: igUser.edge_followed_by?.count || 0,
      following: igUser.edge_follow?.count || 0,
      posts: igUser.edge_owner_to_timeline_media?.count || 0,
      profilePicture: igUser.profile_pic_url_hd || igUser.profile_pic_url || null,
      externalUrl: igUser.external_url || '',
      category: igUser.category_name || '',
      businessCategory: igUser.business_category_name || '',
      business: igUser.is_business_account,
      email: igUser.business_email || '',
      phone: igUser.business_phone_number || '',
      address:
        igUser.business_address_json
          ? JSON.parse(
              igUser.business_address_json
            )
          : null,
      pronouns: igUser.pronouns || [],
      latestPosts
    }

  }

  app.get('/stalk/instagram', async (req, res) => {
    try {
      const { user } = req.query
      if (!user) {
        return res.json({
          status: false,
          error:
            'Falta parametro ?user='
        })
      }

      const result =
        await instagramStalk(user)

      res.json({
        status: true,
        data: result
      })

    } catch (err) {

      res.json({
        status: false,
        error: err.message
      })

    }

  })

}