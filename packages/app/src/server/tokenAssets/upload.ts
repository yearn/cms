import { getUserLogin, openTokenAssetsPullRequest } from './github'

type UploadItem = {
  id: string
  chainId: string
  address?: string
}

class UploadValidationError extends Error {
  status = 400
}

function fail(message: string): never {
  throw new UploadValidationError(message)
}

function validateChainId(chainId: string, subject: string) {
  if (!/^(?:\d+|btcm)$/.test(chainId)) fail(`Invalid chainId for ${subject}`)
  return chainId
}

function parseItems(form: FormData): UploadItem[] {
  try {
    const items = JSON.parse(String(form.get('items') || '[]')) as UploadItem[]
    if (!Array.isArray(items) || items.length === 0) fail('At least one asset is required')
    return items.map((item, index) => ({
      id: String(item.id || index),
      chainId: String(item.chainId || '').trim(),
      address: String(item.address || '').trim(),
    }))
  } catch (error) {
    if (error instanceof UploadValidationError) throw error
    fail('items must be valid JSON')
  }
}

function readUInt32(bytes: Uint8Array, offset: number) {
  return (
    ((bytes[offset] << 24) >>> 0) +
    ((bytes[offset + 1] << 16) >>> 0) +
    ((bytes[offset + 2] << 8) >>> 0) +
    (bytes[offset + 3] >>> 0)
  )
}

function validatePng(bytes: Uint8Array, size: number, field: string) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length < 24 || !signature.every((value, index) => bytes[index] === value)) {
    fail(`${field} must be a PNG`)
  }
  if (readUInt32(bytes, 16) !== size || readUInt32(bytes, 20) !== size) {
    fail(`${field} must be ${size}x${size}`)
  }
}

async function readFiles(form: FormData, id: string) {
  const svg = form.get(`svg_${id}`)
  const png32 = form.get(`png32_${id}`)
  const png128 = form.get(`png128_${id}`)
  if (!(svg instanceof File) || !svg.type.includes('svg')) fail(`SVG is required for asset ${id}`)
  if (!(png32 instanceof File) || !(png128 instanceof File)) fail(`PNG files are required for asset ${id}`)

  const svgBytes = new Uint8Array(await svg.arrayBuffer())
  const png32Bytes = new Uint8Array(await png32.arrayBuffer())
  const png128Bytes = new Uint8Array(await png128.arrayBuffer())
  validatePng(png32Bytes, 32, `png32_${id}`)
  validatePng(png128Bytes, 128, `png128_${id}`)
  return { svgBytes, png32Bytes, png128Bytes }
}

function toBase64(bytes: Uint8Array) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

function assetPaths(target: string, item: UploadItem) {
  const chainId = validateChainId(item.chainId, `asset ${item.id}`)
  const directory =
    target === 'token'
      ? `tokens/${chainId}/${String(item.address).toLowerCase()}`
      : target === 'chain'
        ? `chains/${chainId}`
        : fail('target must be token or chain')
  return [`${directory}/logo.svg`, `${directory}/logo-32.png`, `${directory}/logo-128.png`]
}

function defaultMetadata(target: string, items: UploadItem[], paths: string[]) {
  const noun = target === 'token' ? 'token' : 'chain'
  return {
    title: `feat: add ${noun} assets (${items.length})`,
    body: [
      `Uploaded ${noun} assets through the Yearn CMS.`,
      '',
      'Uploaded locations:',
      ...paths.map((path) => `- /${path}`),
    ].join('\n'),
  }
}

export async function handleTokenAssetUpload(request: Request) {
  try {
    const authorization = request.headers.get('authorization') || ''
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!token) return Response.json({ error: 'Missing GitHub token' }, { status: 401 })

    const form = await request.formData()
    const target = String(form.get('target') || 'token')
    const items = parseItems(form)
    const seen = new Set<string>()
    const files: Array<{ path: string; contentBase64: string }> = []
    const paths: string[] = []

    for (const item of items) {
      if (target === 'token' && !/^0x[a-fA-F0-9]{40}$/.test(String(item.address))) {
        fail(`Invalid EVM address for asset ${item.id}`)
      }
      const identity = target === 'token' ? `${item.chainId}:${item.address?.toLowerCase()}` : item.chainId
      if (seen.has(identity)) fail(`Duplicate asset ${identity}`)
      seen.add(identity)

      const [svgPath, png32Path, png128Path] = assetPaths(target, item)
      const uploaded = await readFiles(form, item.id)
      paths.push(svgPath, png32Path, png128Path)
      files.push(
        { path: svgPath, contentBase64: toBase64(uploaded.svgBytes) },
        { path: png32Path, contentBase64: toBase64(uploaded.png32Bytes) },
        { path: png128Path, contentBase64: toBase64(uploaded.png128Bytes) },
      )
    }

    const defaults = defaultMetadata(target, items, paths)
    const title = String(form.get('prTitle') || '').trim() || defaults.title
    const body = String(form.get('prBody') || '').trim() || defaults.body
    const login = await getUserLogin(token)
    const owner = process.env.TOKEN_ASSETS_REPO_OWNER || 'yearn'
    const repo = process.env.TOKEN_ASSETS_REPO_NAME || 'tokenAssets'
    const prUrl = await openTokenAssetsPullRequest({
      token,
      owner,
      repo,
      branch: `${login}-cms-${target}-assets-${Date.now()}`,
      title,
      body,
      files,
    })

    return Response.json({ ok: true, prUrl })
  } catch (error) {
    const status = error instanceof UploadValidationError ? error.status : 500
    console.error('[token-assets/upload]', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status })
  }
}
