import { createAppAuth } from '@octokit/auth-app'

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

async function fetchGitHubAppToken(): Promise<string | undefined> {
  const now = Date.now()
  
  if (cachedToken && now < cachedTokenExpiry - 300000) { // 5min buffer
    return cachedToken
  }

  if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY || !GITHUB_INSTALLATION_ID) {
    return undefined
  }

  const auth = createAppAuth({
    appId: GITHUB_APP_ID,
    privateKey: GITHUB_APP_PRIVATE_KEY,
    installationId: GITHUB_INSTALLATION_ID,
  })

  const { token, expiresAt } = await auth({ type: 'installation' })
  
  cachedToken = token
  cachedTokenExpiry = new Date(expiresAt).getTime()
  
  return token
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