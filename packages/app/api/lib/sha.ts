// Edge Runtime compatible JWT signing

const REPO_OWNER = process.env.REPO_OWNER || 'yearn'
const REPO_NAME = process.env.REPO_NAME || 'cms'
const SHA_TTL_MS = parseInt(process.env.SHA_TTL_MS || '300000', 10) // 5 minutes default

const GITHUB_APP_ID = process.env.GITHUB_APP_ID
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY
const GITHUB_INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID

let cachedSha = ''
let cachedAt = 0
let cachedToken = ''
let cachedTokenExpiry = 0
let etag = ''

async function createJWT(appId: string, privateKeyPEM: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: appId,
    iat: now - 60, // issued 1 minute in the past
    exp: now + 600 // expires in 10 minutes
  }

  const header = { alg: 'RS256', typ: 'JWT' }
  
  const encoder = new TextEncoder()
  const headerEncoded = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadEncoded = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  const data = encoder.encode(`${headerEncoded}.${payloadEncoded}`)
  
  // Parse PEM key for Web Crypto API
  const pemContent = privateKeyPEM
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')
  
  const keyData = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0))
  
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, data)
  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  return `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`
}

async function fetchGitHubAppToken(): Promise<string | undefined> {
  const now = Date.now()
  
  if (cachedToken && now < cachedTokenExpiry - 300000) { // 5min buffer
    return cachedToken
  }

  if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY || !GITHUB_INSTALLATION_ID) {
    return undefined
  }

  try {
    const jwt = await createJWT(GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY)
    
    const response = await fetch(`https://api.github.com/app/installations/${GITHUB_INSTALLATION_ID}/access_tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'yearn-cms'
      }
    })

    if (!response.ok) {
      console.warn('Failed to get GitHub App installation token:', response.status)
      return undefined
    }

    const data = await response.json()
    cachedToken = data.token
    cachedTokenExpiry = new Date(data.expires_at).getTime()
    
    return cachedToken
  } catch (error) {
    console.warn('GitHub App auth error:', error)
    return undefined
  }
}

export async function fetchSha(): Promise<string> {
  const now = Date.now()
  if (cachedSha && now - cachedAt < SHA_TTL_MS) return cachedSha

  const headers: Record<string, string> = { 'user-agent': 'yearn-cms' }
  
  const token = await fetchGitHubAppToken()
  if (token) { headers.authorization = `Bearer ${token}` }
  
  if (etag) headers['if-none-match'] = etag

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/main`
  const res = await fetch(url, { headers, cache: 'no-store' })

  if (res.status === 304) {
    cachedAt = now
    return cachedSha
  }

  if (!res.ok) throw new Error(`github ${res.status}`)

  etag = res.headers.get('etag') || ''
  const data = await res.json()
  cachedSha = data.sha
  cachedAt = now
  console.log('🔑', 'cachedSha', cachedSha)
  return cachedSha
}