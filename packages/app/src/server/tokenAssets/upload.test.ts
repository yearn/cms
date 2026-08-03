import { afterEach, describe, expect, test } from 'bun:test'
import { handleTokenAssetUpload } from './upload'

const originalFetch = globalThis.fetch
const ADDRESS = '0x0000000000000000000000000000000000000001'

afterEach(() => {
  globalThis.fetch = originalFetch
})

function png(size: number) {
  const bytes = new Uint8Array(24)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const view = new DataView(bytes.buffer)
  view.setUint32(16, size)
  view.setUint32(20, size)
  return new File([bytes], `logo-${size}.png`, { type: 'image/png' })
}

function formWithFiles(
  svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>'], 'logo.svg', {
    type: 'image/svg+xml',
  }),
) {
  const form = new FormData()
  form.set('target', 'token')
  form.set('items', JSON.stringify([{ id: 'asset', chainId: '1', address: ADDRESS }]))
  form.set('svg_asset', svg)
  form.set('png32_asset', png(32))
  form.set('png128_asset', png(128))
  return form
}

function requestFor(form: FormData, token = 'token') {
  return {
    headers: new Headers({ Authorization: `Bearer ${token}` }),
    formData: async () => form,
  } as Request
}

function mockGitHubUpload() {
  const uploadedBlobs: string[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method || 'GET'
    if (url.endsWith('/user')) return Response.json({ login: 'reviewer' })
    if (method === 'GET' && url.endsWith('/repos/yearn/tokenAssets')) {
      return Response.json({ default_branch: 'main' })
    }
    if (method === 'GET' && url.includes('/git/refs/heads/main')) return Response.json({ object: { sha: 'base' } })
    if (method === 'GET' && url.endsWith('/git/commits/base')) {
      return Response.json({ sha: 'base', tree: { sha: 'base-tree' } })
    }
    if (method === 'POST' && url.endsWith('/git/blobs')) {
      const body = JSON.parse(String(init?.body)) as { content: string }
      uploadedBlobs.push(Buffer.from(body.content, 'base64').toString('utf8'))
      return Response.json({ sha: `blob-${uploadedBlobs.length}` })
    }
    if (method === 'POST' && url.endsWith('/git/trees')) return Response.json({ sha: 'tree' })
    if (method === 'POST' && url.endsWith('/git/commits')) return Response.json({ sha: 'commit' })
    if (method === 'POST' && url.endsWith('/git/refs')) return Response.json({ ref: 'refs/heads/reviewer-assets' })
    if (method === 'POST' && url.endsWith('/pulls')) {
      return Response.json({ html_url: 'https://github.com/yearn/tokenAssets/pull/1' })
    }
    throw new Error(`Unexpected GitHub request: ${method} ${url}`)
  }) as unknown as typeof fetch
  return uploadedBlobs
}

describe('handleTokenAssetUpload validation', () => {
  test('rejects a non-SVG part before calling GitHub', async () => {
    let fetchCalls = 0
    globalThis.fetch = (async () => {
      fetchCalls += 1
      throw new Error('GitHub should not be called')
    }) as unknown as typeof fetch
    const executable = new File(['MZ'], 'logo.svg', { type: 'application/octet-stream' })

    const response = await handleTokenAssetUpload(requestFor(formWithFiles(executable)))

    expect(response.status).toBe(400)
    expect(fetchCalls).toBe(0)
  })

  test('rejects oversized files and item counts before calling GitHub', async () => {
    let fetchCalls = 0
    globalThis.fetch = (async () => {
      fetchCalls += 1
      throw new Error('GitHub should not be called')
    }) as unknown as typeof fetch
    const oversized = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'logo.svg', { type: 'image/svg+xml' })
    const oversizedResponse = await handleTokenAssetUpload(requestFor(formWithFiles(oversized)))

    const tooMany = new FormData()
    tooMany.set(
      'items',
      JSON.stringify(Array.from({ length: 11 }, (_, index) => ({ id: String(index), chainId: '1', address: ADDRESS }))),
    )
    const countResponse = await handleTokenAssetUpload(requestFor(tooMany))

    expect(oversizedResponse.status).toBe(400)
    expect(countResponse.status).toBe(400)
    expect(fetchCalls).toBe(0)
  })

  test('returns a safe 401 for an invalid token before buffering files', async () => {
    const form = formWithFiles()
    let arrayBufferCalls = 0
    for (const field of ['svg_asset', 'png32_asset', 'png128_asset']) {
      const file = form.get(field) as File
      const read = file.arrayBuffer.bind(file)
      file.arrayBuffer = async () => {
        arrayBufferCalls += 1
        return read()
      }
    }
    globalThis.fetch = (async () =>
      Response.json({ message: 'Bad credentials' }, { status: 401 })) as unknown as typeof fetch

    const response = await handleTokenAssetUpload(requestFor(form, 'invalid'))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unable to authenticate with GitHub' })
    expect(arrayBufferCalls).toBe(0)
  })

  test('commits supported text and presentation attributes faithfully', async () => {
    const svg = new File(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="gradient"><stop offset="0" stop-color="#0657f9"/></linearGradient><clipPath id="clip"><rect width="24" height="24"/></clipPath><symbol id="mark"><circle cx="12" cy="12" r="10"/></symbol></defs><path d="M0 0" fill="url(#gradient)" clip-path="url(#clip)" fill-rule="evenodd" clip-rule="evenodd"/><use href="#mark" x="0" y="0" width="24" height="24"/><text x="12" y="17" dx="0" dy="0" font-size="14" font-family="sans-serif" font-weight="700" text-anchor="middle" dominant-baseline="auto">Y<tspan x="12" y="20">V</tspan></text></svg>',
      ],
      'logo.svg',
      { type: 'image/svg+xml' },
    )
    const uploadedBlobs = mockGitHubUpload()

    const response = await handleTokenAssetUpload(requestFor(formWithFiles(svg)))
    const committedSvg = uploadedBlobs.find((blob) => blob.startsWith('<svg'))

    expect(response.status).toBe(200)
    expect(committedSvg).toContain('clip-rule="evenodd"')
    expect(committedSvg).toContain('fill="url(#gradient)"')
    expect(committedSvg).toContain('clip-path="url(#clip)"')
    expect(committedSvg).toContain('href="#mark"')
    expect(committedSvg).toContain(
      '<text x="12" y="17" dx="0" dy="0" font-size="14" font-family="sans-serif" font-weight="700" text-anchor="middle" dominant-baseline="auto">Y<tspan x="12" y="20">V</tspan></text>',
    )
  })

  test('rejects dangerous tags, event handlers, and external references instead of rewriting them', async () => {
    const svg = new File(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><path d="M0 0" fill="url(https://evil.test/a)"/><use href="https://evil.test/mark"/></svg>',
      ],
      'logo.svg',
      { type: 'image/svg+xml' },
    )
    const uploadedBlobs = mockGitHubUpload()

    const response = await handleTokenAssetUpload(requestFor(formWithFiles(svg)))
    const result = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(result.error).toContain('tags: <script>')
    expect(result.error).toContain('onload on <svg>')
    expect(result.error).toContain('fill on <path>')
    expect(result.error).toContain('href on <use>')
    expect(result.error).not.toContain('evil.test')
    expect(uploadedBlobs).toHaveLength(0)
  })

  test('rejects CSS styling and names every unsupported construct', async () => {
    const svg = new File(
      [
        '<svg xmlns="http://www.w3.org/2000/svg"><style>.a{fill:#0657f9}</style><rect class="a" width="24" height="24" style="fill:\\75 rl(https://evil.test/a)"/></svg>',
      ],
      'logo.svg',
      { type: 'image/svg+xml' },
    )
    const uploadedBlobs = mockGitHubUpload()

    const response = await handleTokenAssetUpload(requestFor(formWithFiles(svg)))
    const result = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(result.error).toContain('tags: <style>')
    expect(result.error).toContain('class on <rect>')
    expect(result.error).toContain('style on <rect>')
    expect(uploadedBlobs).toHaveLength(0)
  })

  test('keeps rejecting DTD and entity declarations', async () => {
    const svg = new File(
      ['<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg"/>'],
      'logo.svg',
      { type: 'image/svg+xml' },
    )
    mockGitHubUpload()

    const response = await handleTokenAssetUpload(requestFor(formWithFiles(svg)))
    const result = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(result.error).toContain('must not contain DTD or entity declarations')
  })
})
