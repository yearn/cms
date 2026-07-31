import { describe, expect, test } from 'bun:test'
import handler from './cdn'

describe('local CDN reads', () => {
  test('maps missing files to a safe 404', async () => {
    const response = await handler(new Request('http://localhost/api/cdn/missing.json'))

    expect(response.status).toBe(404)
    expect(await response.text()).toBe('not found')
  })

  test('maps directory reads to the same safe 404', async () => {
    const response = await handler(new Request('http://localhost/api/cdn/vaults'))
    const body = await response.text()

    expect(response.status).toBe(404)
    expect(body).toBe('not found')
    expect(body).not.toContain(process.cwd())
  })
})
