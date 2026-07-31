export type AssetMode = 'token' | 'chain'
export type AssetFileKind = 'svg' | 'png32' | 'png128'
export type AssetFiles = Partial<Record<AssetFileKind, File>>
export type PreviewMap = Partial<Record<AssetFileKind, string>>

export type UploadUrlParams = {
  mode?: AssetMode
  chainId?: string
  address?: string
  name?: string
}

export type TokenAssetItem = {
  id: string
  chainId: string
  address: string
  name: string
  generatePng: boolean
  files: AssetFiles
  preview: PreviewMap
  resolvingName: boolean
  resolveError: string
}

export type ChainAssetItem = {
  id: string
  chainId: string
  generatePng: boolean
  files: AssetFiles
  preview: PreviewMap
}

type UploadDraft = {
  version: 1
  savedAt: number
  mode: AssetMode
  tokenItems: Array<Omit<TokenAssetItem, 'preview' | 'resolvingName' | 'resolveError'>>
  chainItems: Array<Omit<ChainAssetItem, 'preview'>>
}

const DB_NAME = 'ycms-token-asset-upload'
const STORE_NAME = 'drafts'
const DRAFT_KEY = 'current'

export function createAssetId() {
  return `asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createTokenAssetItem(): TokenAssetItem {
  return {
    id: createAssetId(),
    chainId: '',
    address: '',
    name: '',
    generatePng: true,
    files: {},
    preview: {},
    resolvingName: false,
    resolveError: '',
  }
}

export function createChainAssetItem(): ChainAssetItem {
  return {
    id: createAssetId(),
    chainId: '',
    generatePng: true,
    files: {},
    preview: {},
  }
}

export function isEvmAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

export function applyUploadUrlParams(
  params: UploadUrlParams,
  tokenItems: TokenAssetItem[],
  chainItems: ChainAssetItem[],
) {
  const nextTokenItems = tokenItems.length ? tokenItems : [createTokenAssetItem()]
  const nextChainItems = chainItems.length ? chainItems : [createChainAssetItem()]
  const [restoredToken, ...otherTokens] = nextTokenItems
  const [restoredChain, ...otherChains] = nextChainItems
  const tokenIdentityChanged =
    (params.chainId !== undefined && params.chainId.trim() !== restoredToken.chainId.trim()) ||
    (params.address !== undefined && params.address.toLowerCase() !== restoredToken.address.toLowerCase())
  const chainIdentityChanged = params.chainId !== undefined && params.chainId.trim() !== restoredChain.chainId.trim()
  const firstToken = tokenIdentityChanged ? createTokenAssetItem() : restoredToken
  const firstChain = chainIdentityChanged ? createChainAssetItem() : restoredChain

  return {
    mode: params.mode ?? (params.address ? 'token' : undefined),
    tokenItems: [
      {
        ...firstToken,
        chainId: params.chainId ?? firstToken.chainId,
        address: params.address ?? firstToken.address,
        name: params.name ?? firstToken.name,
        resolveError: '',
      },
      ...otherTokens,
    ],
    chainItems: [{ ...firstChain, chainId: params.chainId ?? firstChain.chainId }, ...otherChains],
  }
}

export function buildPreviewFromFiles(files: AssetFiles): PreviewMap {
  return {
    svg: files.svg ? URL.createObjectURL(files.svg) : undefined,
    png32: files.png32 ? URL.createObjectURL(files.png32) : undefined,
    png128: files.png128 ? URL.createObjectURL(files.png128) : undefined,
  }
}

export function replaceFilePreview(preview: PreviewMap, kind: AssetFileKind, file: File): PreviewMap {
  revokePreviewUrl(preview[kind])
  return { ...preview, [kind]: URL.createObjectURL(file) }
}

export function revokePreviewUrl(url?: string) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

export function revokePreviewMap(preview: PreviewMap) {
  Object.values(preview).forEach((url) => {
    revokePreviewUrl(url)
  })
}

export async function generatePngPreviews(svgFile: File): Promise<Pick<PreviewMap, 'png32' | 'png128'>> {
  const svgUrl = URL.createObjectURL(svgFile)
  try {
    const image = new Image()
    image.src = svgUrl
    await image.decode()
    return {
      png32: renderImageToPng(image, 32),
      png128: renderImageToPng(image, 128),
    }
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

function renderImageToPng(image: HTMLImageElement, size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available in this browser')

  const scale = Math.min(size / image.width, size / image.height)
  const width = image.width * scale
  const height = image.height * scale
  context.clearRect(0, 0, size, size)
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height)
  return canvas.toDataURL('image/png')
}

export async function dataUrlToFile(dataUrl: string, name: string) {
  const response = await fetch(dataUrl)
  return new File([await response.blob()], name, { type: 'image/png' })
}

async function getPngFile(item: TokenAssetItem | ChainAssetItem, kind: 'png32' | 'png128') {
  if (item.generatePng) {
    const preview = item.preview[kind]
    if (!preview) throw new Error(`Missing generated ${kind} preview`)
    return dataUrlToFile(preview, kind === 'png32' ? 'logo-32.png' : 'logo-128.png')
  }

  const file = item.files[kind]
  if (!file) throw new Error(`Missing manual ${kind} file`)
  return file
}

export async function buildTokenAssetFormData(
  mode: AssetMode,
  tokenItems: TokenAssetItem[],
  chainItems: ChainAssetItem[],
  title: string,
  body: string,
) {
  const form = new FormData()
  const items = mode === 'token' ? tokenItems : chainItems
  form.append('target', mode)
  form.append(
    'items',
    JSON.stringify(
      items.map((item) => ({
        id: item.id,
        chainId: item.chainId,
        ...(mode === 'token' ? { address: (item as TokenAssetItem).address } : {}),
      })),
    ),
  )
  form.append('prTitle', title)
  form.append('prBody', body)

  await Promise.all(
    items.map(async (item) => {
      if (item.files.svg) form.append(`svg_${item.id}`, item.files.svg)
      form.append(`png32_${item.id}`, await getPngFile(item, 'png32'))
      form.append(`png128_${item.id}`, await getPngFile(item, 'png128'))
    }),
  )
  return form
}

export async function readUploadDraft(): Promise<UploadDraft | null> {
  try {
    const db = await openDraftDb()
    if (!db) return null
    const result = await requestResult<UploadDraft | undefined>(
      db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(DRAFT_KEY),
    )
    return result ?? null
  } catch {
    return null
  }
}

export async function saveUploadDraft(draft: UploadDraft) {
  try {
    const db = await openDraftDb()
    if (!db) return
    await requestResult(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(draft, DRAFT_KEY))
  } catch {
    // Draft persistence is a convenience; uploads should still work when IndexedDB is unavailable.
  }
}

export async function clearUploadDraft() {
  try {
    const db = await openDraftDb()
    if (!db) return
    await requestResult(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(DRAFT_KEY))
  } catch {
    // See saveUploadDraft.
  }
}

function openDraftDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
