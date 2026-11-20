import { describe, expect, test } from 'bun:test'
import callback from './auth/github/callback'
import handler, { isAllowedPath } from './pr'

const post = (headers: Record<string, string>, body: unknown) =>
  handler(
    new Request('http://localhost/api/pr', {
      method: 'POST',
      headers: { 'Sec-Fetch-Site': 'same-origin', ...headers },
      body: JSON.stringify(body),
    }),
  )

describe('pr handler', () => {
  test('allows only packages/cdn paths', () => {
    expect(isAllowedPath('packages/cdn/vaults/1.json')).toBe(true)
    expect(isAllowedPath('.github/workflows/sync.yml')).toBe(false)
    expect(isAllowedPath('packages/cdn/../../.github/workflows/x.yml')).toBe(false)
    expect(isAllowedPath('packages/cdn//x.json')).toBe(false)
    expect(isAllowedPath('packages/app/next.config.ts')).toBe(false)
  })

  test('rejects cross-site, unauthenticated and out-of-tree requests before calling GitHub', async () => {
    const change = { path: '.github/workflows/x.yml', contents: 'x' }
    expect((await post({ Cookie: 'github_token=t', 'Sec-Fetch-Site': 'cross-site' }, change)).status).toBe(403)
    expect((await post({ Cookie: 'github_token=t', 'Sec-Fetch-Site': '' }, change)).status).toBe(403)
    expect(
      (await post({ Cookie: 'github_token=t', 'Sec-Fetch-Site': '', Origin: 'https://evil.example' }, change)).status,
    ).toBe(403)
    expect((await post({}, { ...change, token: 't' })).status).toBe(401)
    expect((await post({ Cookie: 'github_token=t' }, change)).status).toBe(400)
  })
})

describe('github callback', () => {
  test('rejects a state that does not match the cookie before exchanging the code', async () => {
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = 'id'
    process.env.GITHUB_CLIENT_SECRET = 'secret'
    const response = await callback(
      new Request('http://localhost/api/auth/github/callback?code=c&state=attacker', {
        headers: { Cookie: 'github_oauth_state=victim' },
      }),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'bad auth challenge' })
  })
})
