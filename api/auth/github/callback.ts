export const config = {
  runtime: 'edge'
}

interface GitHubTokenResponse {
  access_token?: string
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}

export default async function (req: Request): Promise<Response> {
  if (req.method !== 'GET')
    return new Response('Method Not Allowed', { status: 405 })

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  // If envars aren't set
  if (!process.env.VITE_GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: 'Envars not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Handle OAuth errors
  if (error) {
    return new Response(JSON.stringify({ error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Validate required parameters
  if (!code || !state) {
    return new Response(JSON.stringify({ error: 'Missing code or auth_challenge parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.VITE_GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      })
    })

    const tokenData = await tokenResponse.json() as GitHubTokenResponse

    if (tokenData.error) {
      return new Response(JSON.stringify({ error: tokenData.error_description }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const redirect = new URL('/auth/github/success', process.env.URL || 'http://localhost:3000')
    redirect.searchParams.set('token', tokenData.access_token ?? '')
    redirect.searchParams.set('state', state)
    return Response.redirect(redirect.toString(), 302)

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'Failed to exchange code for token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
