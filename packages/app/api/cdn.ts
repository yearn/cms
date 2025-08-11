export const config = { runtime: 'edge' }

const REPO_OWNER = process.env.REPO_OWNER || 'yearn'
const REPO_NAME = process.env.REPO_NAME || 'cms'
const SHA_TTL_MS = parseInt(process.env.SHA_TTL_MS || '300000', 10) // 5 minutes default

let cachedSha = ''
let cachedAt = 0
let etag = ''

async function getSha() {
  const now = Date.now()
  if (cachedSha && now - cachedAt < SHA_TTL_MS) return cachedSha

  const headers: Record<string, string> = { 'user-agent': 'edge-fetch-sha' }
  if (etag) headers['if-none-match'] = etag

  // 👋 PSA: this is a rate limited public endpoint. please consider when chanding SHA_TTL_MS
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

function getPath(url: URL) {
  const path = url.pathname.slice(9)
  if (!path) {
    const schema = url.searchParams.get('schema')
    const file = url.searchParams.get('file')
    return `${schema}/${file}`
  }
  return path
}

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': '*',
        'access-control-max-age': '86400'
      }
    })
  }

  if (req.method !== 'GET') { return new Response('bad method', { status: 405 }) }

  try {
    const url = new URL(req.url)
    const startsWithApiCdn = url.pathname.startsWith('/api/cdn/')
    const startsWithCdn = url.pathname.startsWith('/cdn/')
    if (!(startsWithApiCdn || startsWithCdn))
      return new Response('bad path', { status: 400 })

    const path = getPath(url)
    if (!path) { return new Response('missing path', { status: 400 }) }

    const sha = await getSha()
    const upstream = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}@${sha}/packages/cdn/${path}`
    const upstreamRes = await fetch(upstream, { cache: 'no-store' })

    if (!upstreamRes.ok || !upstreamRes.body)
      return new Response(`upstream ${upstreamRes.status} ${upstream}`, { status: upstreamRes.status })

    const headers = new Headers()
    headers.set('content-type', upstreamRes.headers.get('content-type') || 'application/octet-stream')
    headers.set('cache-control', `public, max-age=60, s-maxage=300, stale-while-revalidate=600`)
    headers.set('access-control-allow-origin', '*')

    return new Response(upstreamRes.body, { status: 200, headers })
  } catch (e: any) {
    return new Response(e?.message || 'error', { status: 500 })
  }
}
