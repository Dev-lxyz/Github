module.exports = function (app) {
  const axios = require('axios')

  const CLIENT_ID =
    'kimne78kx3ncx6brgo4mv6wki5h1ko'

  const DEVICE_ID =
    '047b46700a3e43f09bca98558ef2c1cf'

  const CLIENT_VERSION =
    '7dfe369a-00fe-4c01-8b29-c7c60a204a42'

  const CLIENT_SESSION_ID =
    '6b6cdfccf3ea4c1c'

  const CLIENT_INTEGRITY =
    'v4.local.G13aJW2QP9dm1vISgH8OALOk8h-e10ypqaHBiuH9qqJzIfdELRoYxnWVr6k0FosvkA1LnaRfZTJuBGU7b65XmvSt3JQ-wP_Rvz5U2eUPHsYch6Tjq5nfDrVRe25dP0i0xb4vV8yAZzjalq-0Hnde_uZl0Ws3xvCBnS1Q8C59JG7mK-zGzLzXh3CHCFQq8MCLpczzk7ithuJCJn6EnbhUp-UMiaaL1YAy1vRy9quo0w275uYItPFG9BH-mUhTQOuRTPCawdXh3UcSAOs1rChRShX0q_SNfVQ6ze7oZjzPOPmXco9zn-OWOVNQMpVESd5UTWdiMYFNaHDEKE9mdtuQsRwzIYPgraqkx-C1vjtT75GJc7qsW9f80OGepevbzfQdWRMR7fYlRntdo02hCsLk5hyEUWULDs9wu6XpXV4N26kPBsGJ-GwWVBgxOCgo6jKnTO-yA'

  const api = axios.create({
    baseURL: 'https://gql.twitch.tv',
    timeout: 20000,
    headers: {
      'Client-Id': CLIENT_ID,
      'X-Device-Id': DEVICE_ID,
      'Client-Version': CLIENT_VERSION,
      'Client-Session-Id': CLIENT_SESSION_ID,
      'Client-Integrity': CLIENT_INTEGRITY,
      'Accept-Language': 'en-US',
      'Content-Type': 'application/json'
    }
  })

  function requestId() {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    let id = ''

    for (let i = 0; i < 16; i++) {
      id += chars.charAt(
        Math.floor(Math.random() * chars.length)
      )
    }

    return id
  }

  async function searchSuggestions(query) {
    const { data } = await api.post('/gql', [{
      operationName:
        'SearchTray_SearchSuggestions',
      variables: {
        requestID: requestId(),
        queryFragment: query
      },
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash:
            '176dee782d1da7f1913242153c4abc4ef2a2b0b5ccb490d4a7b679e72bf1f45e'
        }
      }
    }])

    return data
  }

  async function searchChannels(query) {
    const { data } = await api.post('/gql', [{
      operationName:
        'SearchResultsPage_SearchResults',
      variables: {
        platform: 'mobile_web',
        options: {
          targets: [
            {
              index: 'CHANNEL'
            }
          ]
        },
        query
      },
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash:
            'c1fe88431e82c9fc449f6478f9864ae095614baf1a0fac686d7ad8e23c6aea7e'
        }
      }
    }])

    return data
  }

  function parseSuggestions(data) {
    return (
      data?.[0]?.data?.searchSuggestions?.edges
        ?.map(v => v.node?.text)
        ?.filter(Boolean) || []
    )
  }

  function parseChannels(data) {
    const edges =
      data?.[0]?.data?.searchFor?.channels?.edges || []

    return edges.map(v => ({
      id:
        v.item?.id || null,

      login:
        v.item?.login || null,

      displayName:
        v.item?.displayName || null,

      description:
        v.item?.description || null,

      followers:
        v.item?.followers?.totalCount || 0,

      partner:
        v.item?.roles?.isPartner || false,

      title:
        v.item?.broadcastSettings?.title || null,

      thumbnail:
        v.item?.profileImageURL || null,

      lastBroadcast:
        v.item?.lastBroadcast?.startedAt || null
    }))
  }

  async function twitchSearch(query) {
    const suggestionData =
      await searchSuggestions(query)

    const suggestions =
      parseSuggestions(suggestionData)

    const searchQuery =
      suggestions[0] || query

    const channelData =
      await searchChannels(searchQuery)

    const channels =
      parseChannels(channelData)

    return {
      query,
      suggestion: searchQuery,
      total: channels.length,
      result: channels
    }
  }

  app.get('/search/twitch', async (req, res) => {
    try {
      const { q } = req.query

      if (!q) {
        return res.json({
          status: false,
          error: 'Falta parametro ?q='
        })
      }

      const result =
        await twitchSearch(q)

      res.json({
        status: true,
        data: result
      })

    } catch (err) {

      res.json({
        status: false,
        error:
          err.response?.data ||
          err.message
      })

    }

  })

}