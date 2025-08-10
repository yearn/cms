import { serve } from 'bun'
import githubCallback from './auth/github/callback'
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

    return new Response('Not found', { status: 404 })
  },
  port: 3001
})
