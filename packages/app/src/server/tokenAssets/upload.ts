import sanitizeHtml from 'sanitize-html'
import { GitHubApiError, getUserLogin, openTokenAssetsPullRequest } from './github'

type UploadItem = {
  id: string
  chainId: string
  address?: string
}

class UploadValidationError extends Error {
  status = 400
}

const MAX_ASSET_ITEMS = 10
const MAX_FILE_BYTES = 2 * 1024 * 1024
const MAX_TOTAL_BYTES = 12 * 1024 * 1024

const SVG_ALLOWED_TAGS = [
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'rect',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'pattern',
  'title',
  'desc',
  'symbol',
  'use',
]

const SVG_ALLOWED_ATTRIBUTES = {
  svg: ['xmlns', 'xmlns:xlink', 'viewBox', 'width', 'height', 'preserveAspectRatio'],
  path: ['d', 'pathLength'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  line: ['x1', 'x2', 'y1', 'y2'],
  polyline: ['points'],
  polygon: ['points'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  linearGradient: ['x1', 'x2', 'y1', 'y2', 'gradientUnits', 'gradientTransform', 'spreadMethod'],
  radialGradient: ['cx', 'cy', 'r', 'fx', 'fy', 'fr', 'gradientUnits', 'gradientTransform', 'spreadMethod'],
  stop: ['offset', 'stop-color', 'stop-opacity'],
  pattern: ['x', 'y', 'width', 'height', 'patternUnits', 'patternContentUnits', 'patternTransform', 'viewBox'],
  use: ['href', 'xlink:href', 'x', 'y', 'width', 'height'],
  '*': [
    'id',
    'fill',
    'fill-opacity',
    'fill-rule',
    'stroke',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-opacity',
    'opacity',
    'transform',
    'clip-path',
    'mask',
    'vector-effect',
  ],
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
    if (items.length > MAX_ASSET_ITEMS) fail(`A maximum of ${MAX_ASSET_ITEMS} assets may be uploaded at once`)
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

type AssetFileParts = { svg: File; png32: File; png128: File }

function collectFileParts(form: FormData, items: UploadItem[]) {
  let totalBytes = 0
  const parts = new Map<string, AssetFileParts>()

  for (const item of items) {
    const svg = form.get(`svg_${item.id}`)
    const png32 = form.get(`png32_${item.id}`)
    const png128 = form.get(`png128_${item.id}`)
    if (!(svg instanceof File) || svg.type !== 'image/svg+xml') fail(`SVG is required for asset ${item.id}`)
    if (!(png32 instanceof File) || !(png128 instanceof File)) fail(`PNG files are required for asset ${item.id}`)
    if (png32.type !== 'image/png' || png128.type !== 'image/png') fail(`PNG files are required for asset ${item.id}`)

    for (const [field, file] of [
      [`svg_${item.id}`, svg],
      [`png32_${item.id}`, png32],
      [`png128_${item.id}`, png128],
    ] as const) {
      if (file.size > MAX_FILE_BYTES) fail(`${field} exceeds the ${MAX_FILE_BYTES / 1024 / 1024} MB file limit`)
      totalBytes += file.size
    }
    parts.set(item.id, { svg, png32, png128 })
  }

  if (totalBytes > MAX_TOTAL_BYTES) fail(`Upload exceeds the ${MAX_TOTAL_BYTES / 1024 / 1024} MB total limit`)
  return parts
}

function sanitizeSvg(bytes: Uint8Array, field: string) {
  let source: string
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    fail(`${field} must be UTF-8 SVG content`)
  }
  if (/<!\s*(?:doctype|entity)\b/i.test(source)) fail(`${field} must not contain DTD or entity declarations`)

  const sanitized = sanitizeHtml(source, {
    allowedTags: SVG_ALLOWED_TAGS,
    allowedAttributes: SVG_ALLOWED_ATTRIBUTES,
    allowedSchemes: [],
    allowProtocolRelative: false,
    parser: { lowerCaseTags: false, lowerCaseAttributeNames: false },
    transformTags: {
      '*': (tagName, attributes) => {
        const safeAttributes = { ...attributes }
        for (const [name, value] of Object.entries(safeAttributes)) {
          if (/url\s*\(/i.test(value) && !/^url\(#[a-zA-Z_][\w:.-]*\)$/.test(value)) delete safeAttributes[name]
          if ((name === 'href' || name === 'xlink:href') && !/^#[a-zA-Z_][\w:.-]*$/.test(value)) {
            delete safeAttributes[name]
          }
        }
        return { tagName, attribs: safeAttributes }
      },
    },
  }).trim()

  if (!/^<svg(?:\s|>)/.test(sanitized) || !/<\/svg>$/.test(sanitized)) fail(`${field} must contain an SVG root`)
  return new TextEncoder().encode(sanitized)
}

async function readFiles(parts: AssetFileParts, id: string) {
  const svgBytes = sanitizeSvg(new Uint8Array(await parts.svg.arrayBuffer()), `svg_${id}`)
  const png32Bytes = new Uint8Array(await parts.png32.arrayBuffer())
  const png128Bytes = new Uint8Array(await parts.png128.arrayBuffer())
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
    if (target !== 'token' && target !== 'chain') fail('target must be token or chain')
    const items = parseItems(form)
    const fileParts = collectFileParts(form, items)
    const seen = new Set<string>()
    const seenIds = new Set<string>()
    const files: Array<{ path: string; contentBase64: string }> = []
    const paths: string[] = []

    let login: string
    try {
      login = await getUserLogin(token)
    } catch (error) {
      if (error instanceof GitHubApiError && (error.status === 401 || error.status === 403)) {
        return Response.json({ error: 'Unable to authenticate with GitHub' }, { status: 401 })
      }
      throw error
    }

    for (const item of items) {
      if (seenIds.has(item.id)) fail(`Duplicate asset id ${item.id}`)
      seenIds.add(item.id)
      if (target === 'token' && !/^0x[a-fA-F0-9]{40}$/.test(String(item.address))) {
        fail(`Invalid EVM address for asset ${item.id}`)
      }
      const identity = target === 'token' ? `${item.chainId}:${item.address?.toLowerCase()}` : item.chainId
      if (seen.has(identity)) fail(`Duplicate asset ${identity}`)
      seen.add(identity)

      const [svgPath, png32Path, png128Path] = assetPaths(target, item)
      const uploaded = await readFiles(fileParts.get(item.id) as AssetFileParts, item.id)
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
    if (error instanceof UploadValidationError) return Response.json({ error: error.message }, { status: error.status })
    console.error('[token-assets/upload]', error)
    if (error instanceof GitHubApiError) {
      const status = error.status === 401 || error.status === 403 ? 401 : 502
      const message = status === 401 ? 'Unable to authenticate with GitHub' : 'GitHub request failed'
      return Response.json({ error: message }, { status })
    }
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
