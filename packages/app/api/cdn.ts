export const config = { runtime: 'edge' }

function getPath(url: URL) {
  const schema = url.searchParams.get('schema')
  const file = url.searchParams.get('file')
  if (schema && file) {
    return `${schema}/${file}`
  }

  if (url.pathname.startsWith('/api/cdn/')) {
    return url.pathname.slice(9) // Remove '/api/cdn/'
  }
  if (url.pathname.startsWith('/cdn/')) {
    return url.pathname.slice(5) // Remove '/cdn/'
  }

  return undefined
}

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': '*',
        'access-control-max-age': '86400',
      },
    })
  }

  if (req.method !== 'GET') {
    return new Response('bad method', { status: 405 })
  }

  try {
    const url = new URL(req.url)
    const startsWithApiCdn = url.pathname.startsWith('/api/cdn/')
    const startsWithCdn = url.pathname.startsWith('/cdn/')
    if (!(startsWithApiCdn || startsWithCdn)) return new Response('bad path', { status: 400 })

    const path = getPath(url)
    if (!path) {
      return new Response('missing path', { status: 400 })
    }

    if (!/^[a-zA-Z0-9/_.-]+$/.test(path) || path.includes('..') || path.startsWith('/')) {
      return new Response('invalid path', { status: 400 })
    }

    // Read directly from the filesystem
    const fs = await import('node:fs/promises')
    const { join } = await import('node:path')
    
    try {
      const filePath = join(process.cwd(), '../../cdn', path)
      const content = await fs.readFile(filePath, 'utf-8')
      
      const headers = new Headers()
      headers.set('content-type', 'application/json')
      headers.set('cache-control', `public, max-age=60, s-maxage=300, stale-while-revalidate=600`)
      headers.set('access-control-allow-origin', '*')

      return new Response(content, { status: 200, headers })
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return new Response('not found', { status: 404 })
      }
      throw error
    }
  } catch (e: any) {
    return new Response(e?.message || 'error', { status: 500 })
  }
}
