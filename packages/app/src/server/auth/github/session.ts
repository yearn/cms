export const TOKEN_COOKIE = 'github_token'
export const USER_COOKIE = 'github_user'
export const STATE_COOKIE = 'github_oauth_state'

export function getCookie(req: Request, name: string): string {
  const match = (req.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ''
}

export function getGithubToken(req: Request): string {
  return getCookie(req, TOKEN_COOKIE)
}

export function isCrossSiteRequest(req: Request): boolean {
  const site = req.headers.get('sec-fetch-site')
  if (site) return site !== 'same-origin'
  return req.headers.get('origin') !== new URL(req.url).origin
}

export function sessionCookies(req: Request, token: string, login: string): string[] {
  const secure = new URL(process.env.URL || req.url).protocol === 'https:' ? '; Secure' : ''
  const expire = token ? '' : '; Max-Age=0'
  return [
    `${TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/api; HttpOnly; SameSite=Lax${secure}${expire}`,
    `${USER_COOKIE}=${encodeURIComponent(login)}; Path=/; SameSite=Lax${secure}${expire}`,
    `${STATE_COOKIE}=; Path=/api/auth/github; SameSite=Lax; Max-Age=0`,
  ]
}
