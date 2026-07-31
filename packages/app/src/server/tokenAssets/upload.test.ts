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

  test('sanitizes SVG content and reaches the GitHub commit flow for valid files', async () => {
    const svg = new File(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><path d="M0 0" fill="url(https://evil.test/a)"/></svg>',
      ],
      'logo.svg',
      { type: 'image/svg+xml' },
    )
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
      if (method === 'POST' && url.endsWith('/pulls'))
        return Response.json({ html_url: 'https://github.com/yearn/tokenAssets/pull/1' })
      throw new Error(`Unexpected GitHub request: ${method} ${url}`)
    }) as unknown as typeof fetch

    const response = await handleTokenAssetUpload(requestFor(formWithFiles(svg)))
    const sanitizedSvg = uploadedBlobs.find((blob) => blob.startsWith('<svg'))

    expect(response.status).toBe(200)
    expect(sanitizedSvg).toContain('<path d="M0 0">')
    expect(sanitizedSvg).not.toContain('script')
    expect(sanitizedSvg).not.toContain('onload')
    expect(sanitizedSvg).not.toContain('evil.test')
  })
})
