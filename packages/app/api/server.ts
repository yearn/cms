import { serve } from 'bun'
import githubCallback from './auth/github/callback'
import cdn from './cdn'
import ping from './ping'
import pr from './pr'

serve({
  fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === '/api/ping') {
      return ping(req)
    }

    if (url.pathname === '/api/auth/github/callback') {
      return githubCallback(req)
    }

    if (url.pathname === '/api/pr') {
      return pr(req)
    }

    if (url.pathname.startsWith('/api/cdn/')) {
      return cdn(req)
    }

    return new Response('Not found', { status: 404 })
  },
  port: 3001
})

console.log('🚀 api up')
