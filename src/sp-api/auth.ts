import db from 'db'
import { SpAPIAccountCredentials } from 'types';

const AMAZON_AUTH_URL = 'https://api.amazon.com/auth/o2/token'

export const _spApiAccessTokenCache: Record<string, { refreshToken: string; accessToken: string } | undefined> = {}

const getAccessTokenForUser = (userCredentials: SpAPIAccountCredentials, cachedRefreshToken?: string) => {
  if (Bun.env.NODE_ENV === 'test') return

  console.log('> Beginning to fetch Amazon access token ...')

  fetchAccessToken({
    clientId: userCredentials.clientId,
    clientSecret: userCredentials.clientSecret,

    // if we have a short-lived refresh-token, use that
    // otherwise use the long-lived refresh token
    refreshToken: cachedRefreshToken ?? userCredentials.longTermRefreshToken,
  }).then((data) => {
    _spApiAccessTokenCache[userCredentials.sellerId] = { accessToken: data.access_token, refreshToken: data.refresh_token }

    console.log('> Finished fetching access token for seller ', userCredentials.sellerId)
  })
}

export const initAccessTokenSync = async () => {
  const TWENTY_MINS_MS = 1000 * 60 * 20
  const credentials = await db.spAPIAccountCredentials.findMany()

  const go = async () => {
    for (const cred of credentials) {
      await getAccessTokenForUser(cred)
    }
  }

  go()

  // repeat every twenty mins
  setInterval(() => {
    go()
  }, TWENTY_MINS_MS)
}



interface AmazonAuthResponse {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
}

interface AccessConfig {
  refreshToken: string
  clientId: string
  clientSecret: string
}


async function fetchAccessToken({
  refreshToken,
  clientId,
  clientSecret,
}: AccessConfig): Promise<AmazonAuthResponse> {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })

  try {
    const response = await fetch(AMAZON_AUTH_URL, {
      method: 'POST',
      headers: headers,
      body: body.toString(),
    })

    if (response.ok) {
      return response.json() as Promise<AmazonAuthResponse>
    } else {
      const errMessage = await response.text()
      console.error(`Error fetching access token: ${errMessage}`)
      throw new Error(`Error fetching access token: ${response.status}`)
    }
  } catch (error) {
    console.error('An error occurred:', error)
    throw error
  }
}
