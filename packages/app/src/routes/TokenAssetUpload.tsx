'use client'

import Image from 'next/image'
import Link from 'next/link'
import { type FormEvent, useEffect, useId, useMemo, useState } from 'react'
import {
  PiArrowLeft,
  PiCheckCircle,
  PiGitPullRequest,
  PiPlus,
  PiTrash,
  PiUploadSimple,
  PiWarningCircle,
  PiX,
} from 'react-icons/pi'
import { chains } from '../../lib/chains'
import { cn } from '../components/eg/cn'
import Button from '../components/eg/elements/Button'
import Card from '../components/eg/elements/Card'
import Input from '../components/eg/elements/Input'
import Switch from '../components/eg/elements/Switch'
import {
  type AssetFileKind,
  type AssetFiles,
  type AssetMode,
  buildPreviewFromFiles,
  type ChainAssetItem,
  clearUploadDraft,
  createChainAssetItem,
  createTokenAssetItem,
  dataUrlToFile,
  generatePngPreviews,
  isEvmAddress,
  type PreviewMap,
  readUploadDraft,
  replaceFilePreview,
  revokePreviewMap,
  saveUploadDraft,
  type TokenAssetItem,
} from '../lib/tokenAssetUpload'

export type UploadUrlParams = {
  mode?: AssetMode
  chainId?: string
  address?: string
  name?: string
}

type Status = {
  tone: 'info' | 'error' | 'success'
  title: string
  message?: string
  prUrl?: string
}

const inputLabelClassName = 'mb-2 block text-sm font-bold'
const chainOptions = Object.values(chains).sort((a, b) => a.name.localeCompare(b.name))

function applyUrlParams(params: UploadUrlParams, tokenItems: TokenAssetItem[], chainItems: ChainAssetItem[]) {
  const nextTokenItems = tokenItems.length ? tokenItems : [createTokenAssetItem()]
  const nextChainItems = chainItems.length ? chainItems : [createChainAssetItem()]
  const [firstToken, ...otherTokens] = nextTokenItems
  const [firstChain, ...otherChains] = nextChainItems
  const address = params.address ?? firstToken.address

  return {
    mode: params.mode ?? (params.address ? 'token' : undefined),
    tokenItems: [
      {
        ...firstToken,
        chainId: params.chainId ?? firstToken.chainId,
        address,
        name: params.name ?? firstToken.name,
        resolveError: '',
      },
      ...otherTokens,
    ],
    chainItems: [{ ...firstChain, chainId: params.chainId ?? firstChain.chainId }, ...otherChains],
  }
}

export default function TokenAssetUpload({ initialParams = {} }: { initialParams?: UploadUrlParams }) {
  const [mode, setMode] = useState<AssetMode>(initialParams.mode ?? 'token')
  const [tokenItems, setTokenItems] = useState<TokenAssetItem[]>([createTokenAssetItem()])
  const [chainItems, setChainItems] = useState<ChainAssetItem[]>([createChainAssetItem()])
  const [reviewing, setReviewing] = useState(false)
  const [prTitle, setPrTitle] = useState('')
  const [prBody, setPrBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const signedIn = Boolean(sessionStorage.getItem('github_token'))

  const canSubmit = useMemo(() => {
    if (mode === 'chain') {
      return chainItems.every(
        (item) =>
          item.chainId &&
          item.files.svg &&
          (item.generatePng ? item.preview.png32 && item.preview.png128 : item.files.png32 && item.files.png128),
      )
    }
    return tokenItems.every(
      (item) =>
        item.chainId &&
        isEvmAddress(item.address) &&
        item.files.svg &&
        (item.generatePng ? item.preview.png32 && item.preview.png128 : item.files.png32 && item.files.png128),
    )
  }, [chainItems, mode, tokenItems])

  useEffect(() => {
    let cancelled = false
    async function restoreDraft() {
      const draft = await readUploadDraft()
      if (cancelled) return

      const restoredTokens = (draft?.tokenItems.length ? draft.tokenItems : [createTokenAssetItem()]).map((item) => ({
        ...createTokenAssetItem(),
        ...item,
        preview: buildPreviewFromFiles(item.files),
        resolvingName: false,
        resolveError: '',
      }))
      const restoredChains = (draft?.chainItems.length ? draft.chainItems : [createChainAssetItem()]).map((item) => ({
        ...createChainAssetItem(),
        ...item,
        preview: buildPreviewFromFiles(item.files),
      }))
      const withParams = applyUrlParams(initialParams, restoredTokens, restoredChains)
      setMode(withParams.mode ?? draft?.mode ?? 'token')
      setTokenItems(withParams.tokenItems)
      setChainItems(withParams.chainItems)

      for (const item of withParams.tokenItems) {
        if (item.generatePng && item.files.svg) void regenerateTokenPngs(item.id, item.files.svg)
      }
      for (const item of withParams.chainItems) {
        if (item.generatePng && item.files.svg) void regenerateChainPngs(item.id, item.files.svg)
      }
      setDraftReady(true)
    }
    void restoreDraft()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!draftReady) return
    void saveUploadDraft({
      version: 1,
      savedAt: Date.now(),
      mode,
      tokenItems: tokenItems.map(
        ({ preview: _preview, resolvingName: _resolving, resolveError: _error, ...item }) => item,
      ),
      chainItems: chainItems.map(({ preview: _preview, ...item }) => item),
    })
  }, [chainItems, draftReady, mode, tokenItems])

  function updateTokenItem(id: string, update: (item: TokenAssetItem) => TokenAssetItem) {
    setTokenItems((items) => items.map((item) => (item.id === id ? update(item) : item)))
  }

  function updateChainItem(id: string, update: (item: ChainAssetItem) => ChainAssetItem) {
    setChainItems((items) => items.map((item) => (item.id === id ? update(item) : item)))
  }

  async function regenerateTokenPngs(id: string, file: File) {
    try {
      const pngs = await generatePngPreviews(file)
      updateTokenItem(id, (item) => ({ ...item, preview: { ...item.preview, ...pngs } }))
    } catch (error) {
      setStatus({
        tone: 'error',
        title: 'Could not generate PNGs',
        message: error instanceof Error ? error.message : 'Upload the PNG sizes manually instead.',
      })
    }
  }

  async function regenerateChainPngs(id: string, file: File) {
    try {
      const pngs = await generatePngPreviews(file)
      updateChainItem(id, (item) => ({ ...item, preview: { ...item.preview, ...pngs } }))
    } catch (error) {
      setStatus({
        tone: 'error',
        title: 'Could not generate PNGs',
        message: error instanceof Error ? error.message : 'Upload the PNG sizes manually instead.',
      })
    }
  }

  function setTokenFile(id: string, kind: AssetFileKind, file: File) {
    const current = tokenItems.find((item) => item.id === id)
    updateTokenItem(id, (item) => ({
      ...item,
      files: { ...item.files, [kind]: file },
      preview: replaceFilePreview(item.preview, kind, file),
    }))
    if (kind === 'svg' && current?.generatePng) void regenerateTokenPngs(id, file)
  }

  function setChainFile(id: string, kind: AssetFileKind, file: File) {
    const current = chainItems.find((item) => item.id === id)
    updateChainItem(id, (item) => ({
      ...item,
      files: { ...item.files, [kind]: file },
      preview: replaceFilePreview(item.preview, kind, file),
    }))
    if (kind === 'svg' && current?.generatePng) void regenerateChainPngs(id, file)
  }

  async function resolveTokenName(id: string) {
    const item = tokenItems.find((candidate) => candidate.id === id)
    if (!item || item.name || !item.chainId || !isEvmAddress(item.address)) return

    updateTokenItem(id, (current) => ({ ...current, resolvingName: true, resolveError: '' }))
    try {
      const response = await fetch('/api/token-assets/erc20-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainId: Number(item.chainId), address: item.address }),
      })
      const result = (await response.json()) as { name?: string; error?: string }
      if (!response.ok || !result.name) throw new Error(result.error || 'Token name was not returned')
      updateTokenItem(id, (current) => ({ ...current, name: current.name || result.name || '', resolvingName: false }))
    } catch {
      updateTokenItem(id, (current) => ({
        ...current,
        resolvingName: false,
        resolveError: 'Could not fetch the token name. Check the chain and address.',
      }))
    }
  }

  function clearItem(id: string) {
    if (mode === 'token') {
      const item = tokenItems.find((candidate) => candidate.id === id)
      if (item) revokePreviewMap(item.preview)
      updateTokenItem(id, () => ({ ...createTokenAssetItem(), id }))
    } else {
      const item = chainItems.find((candidate) => candidate.id === id)
      if (item) revokePreviewMap(item.preview)
      updateChainItem(id, () => ({ ...createChainAssetItem(), id }))
    }
  }

  function removeItem(id: string) {
    if (mode === 'token') {
      const item = tokenItems.find((candidate) => candidate.id === id)
      if (item) revokePreviewMap(item.preview)
      setTokenItems((items) => items.filter((candidate) => candidate.id !== id))
    } else {
      const item = chainItems.find((candidate) => candidate.id === id)
      if (item) revokePreviewMap(item.preview)
      setChainItems((items) => items.filter((candidate) => candidate.id !== id))
    }
  }

  function openReview(event: FormEvent) {
    event.preventDefault()
    if (!signedIn) {
      setStatus({
        tone: 'error',
        title: 'GitHub sign-in required',
        message: 'Sign in so the CMS can create a tokenAssets branch and pull request for you.',
      })
      return
    }
    const items = mode === 'token' ? tokenItems : chainItems
    const identities = items.map((item) =>
      mode === 'token' ? `${item.chainId}:${(item as TokenAssetItem).address.toLowerCase()}` : item.chainId,
    )
    if (new Set(identities).size !== identities.length) {
      setStatus({ tone: 'error', title: 'Duplicate assets', message: 'Each asset in this upload must be unique.' })
      return
    }

    const metadata = defaultPrMetadata(mode, tokenItems, chainItems)
    setPrTitle(metadata.title)
    setPrBody(metadata.body)
    setReviewing(true)
    setStatus(null)
  }

  async function submitPullRequest() {
    const token = sessionStorage.getItem('github_token')
    if (!token) return
    setSubmitting(true)
    setStatus({ tone: 'info', title: 'Creating pull request', message: 'Uploading the images to tokenAssets.' })
    try {
      const form = await buildFormData(mode, tokenItems, chainItems, prTitle, prBody)
      const response = await fetch('/api/token-assets/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const result = (await response.json()) as { prUrl?: string; error?: string }
      if (!response.ok) throw new Error(result.error || `Upload failed (${response.status})`)

      setStatus({
        tone: 'success',
        title: 'Pull request created',
        message: 'Review the generated changes on GitHub before merging.',
        prUrl: result.prUrl,
      })
      setReviewing(false)
      void clearUploadDraft()
      tokenItems.forEach((item) => {
        revokePreviewMap(item.preview)
      })
      chainItems.forEach((item) => {
        revokePreviewMap(item.preview)
      })
      setTokenItems([createTokenAssetItem()])
      setChainItems([createChainAssetItem()])
    } catch (error) {
      setStatus({
        tone: 'error',
        title: 'Upload failed',
        message: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const activeItems = mode === 'token' ? tokenItems : chainItems

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 pb-16 pt-5">
      <div className="flex flex-col gap-4 border-b border-[var(--card-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/tokens" className="mb-4 flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
            <PiArrowLeft />
            Tokens
          </Link>
          <h1 className="text-3xl font-bold">Add token assets</h1>
          <p className="mt-2 max-w-2xl opacity-70">
            Prepare SVG and PNG logos, then open a pull request in the Yearn tokenAssets repository.
          </p>
        </div>
      </div>

      {status && <StatusBanner status={status} onDismiss={() => setStatus(null)} />}

      <form onSubmit={openReview} className="flex flex-col gap-6">
        <Card className="gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-bold">Asset type</div>
              <div className="text-sm opacity-60">Token logos are organized by chain and contract address.</div>
            </div>
            <div className="flex overflow-hidden rounded-primary border border-interactive-secondary-border">
              {(['token', 'chain'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => {
                    setMode(value)
                    setReviewing(false)
                  }}
                  className={cn(
                    'h-10 px-5 capitalize transition-colors',
                    mode === value
                      ? 'bg-interactive-primary text-interactive-primary-text'
                      : 'bg-interactive-secondary text-interactive-secondary-text hover:bg-interactive-secondary-hover',
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[var(--card-border)] border-y border-[var(--card-border)]">
            {activeItems.map((item, index) =>
              mode === 'token' ? (
                <TokenAssetFields
                  key={item.id}
                  item={item as TokenAssetItem}
                  index={index}
                  onChange={updateTokenItem}
                  onFile={setTokenFile}
                  onResolveName={resolveTokenName}
                  onGeneratePng={async (id, value) => {
                    const current = tokenItems.find((candidate) => candidate.id === id)
                    updateTokenItem(id, (candidate) => ({ ...candidate, generatePng: value }))
                    if (value && current?.files.svg) await regenerateTokenPngs(id, current.files.svg)
                  }}
                  onClear={clearItem}
                  onRemove={removeItem}
                />
              ) : (
                <ChainAssetFields
                  key={item.id}
                  item={item as ChainAssetItem}
                  index={index}
                  onChange={updateChainItem}
                  onFile={setChainFile}
                  onGeneratePng={async (id, value) => {
                    const current = chainItems.find((candidate) => candidate.id === id)
                    updateChainItem(id, (candidate) => ({ ...candidate, generatePng: value }))
                    if (value && current?.files.svg) await regenerateChainPngs(id, current.files.svg)
                  }}
                  onClear={clearItem}
                  onRemove={removeItem}
                />
              ),
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              className="gap-2 text-base"
              onClick={() =>
                mode === 'token'
                  ? setTokenItems((items) => [...items, createTokenAssetItem()])
                  : setChainItems((items) => [...items, createChainAssetItem()])
              }
            >
              <PiPlus />
              Add another {mode}
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="gap-2 text-base"
              disabled={!canSubmit || !signedIn || submitting}
              title={!signedIn ? 'Sign in with GitHub to create a pull request' : undefined}
            >
              <PiGitPullRequest />
              Review pull request
            </Button>
          </div>
        </Card>

        {reviewing && (
          <Card className="gap-5 border-interactive-primary-border">
            <div>
              <h2 className="text-xl font-bold">Review pull request</h2>
              <p className="mt-1 text-sm opacity-60">
                This creates a branch in tokenAssets directly when permitted, or uses your fork as a fallback.
              </p>
            </div>
            <label>
              <span className={inputLabelClassName}>Title</span>
              <Input className="w-full" value={prTitle} onChange={(event) => setPrTitle(event.target.value)} />
            </label>
            <label>
              <span className={inputLabelClassName}>Description</span>
              <textarea
                className="min-h-44 w-full rounded-primary border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-3 font-mono text-sm outline-none focus:border-[var(--color-input-border-focus)]"
                value={prBody}
                onChange={(event) => setPrBody(event.target.value)}
              />
            </label>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" className="text-base" onClick={() => setReviewing(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={submitting ? 'busy' : 'primary'}
                className="gap-2 text-base"
                disabled={!prTitle.trim() || !prBody.trim()}
                onClick={() => void submitPullRequest()}
              >
                <PiGitPullRequest />
                Create pull request
              </Button>
            </div>
          </Card>
        )}
      </form>
    </div>
  )
}

function TokenAssetFields({
  item,
  index,
  onChange,
  onFile,
  onResolveName,
  onGeneratePng,
  onClear,
  onRemove,
}: {
  item: TokenAssetItem
  index: number
  onChange: (id: string, update: (item: TokenAssetItem) => TokenAssetItem) => void
  onFile: (id: string, kind: AssetFileKind, file: File) => void
  onResolveName: (id: string) => void
  onGeneratePng: (id: string, value: boolean) => void
  onClear: (id: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <AssetSection index={index} type="token" onClear={() => onClear(item.id)} onRemove={() => onRemove(item.id)}>
      <div className="grid gap-4 md:grid-cols-3">
        <ChainInput
          value={item.chainId}
          onChange={(chainId) => onChange(item.id, (current) => ({ ...current, chainId }))}
          onBlur={() => onResolveName(item.id)}
        />
        <label className="md:col-span-2">
          <span className={inputLabelClassName}>Token address</span>
          <Input
            className="w-full"
            value={item.address}
            placeholder="0x…"
            theme={item.address && !isEvmAddress(item.address) ? 'error' : undefined}
            onChange={(event) => onChange(item.id, (current) => ({ ...current, address: event.target.value }))}
            onBlur={() => onResolveName(item.id)}
          />
          {item.address && !isEvmAddress(item.address) && (
            <span className="mt-1 block text-xs text-red-500">Enter a valid EVM contract address.</span>
          )}
        </label>
        <label className="md:col-span-3">
          <span className={inputLabelClassName}>
            Name <span className="font-normal opacity-50">(optional)</span>
          </span>
          <Input
            className="w-full"
            value={item.name}
            placeholder="Fetched from the token contract when available"
            onChange={(event) => onChange(item.id, (current) => ({ ...current, name: event.target.value }))}
          />
          {item.resolvingName && <span className="mt-1 block text-xs opacity-60">Fetching token name…</span>}
          {item.resolveError && <span className="mt-1 block text-xs text-red-500">{item.resolveError}</span>}
        </label>
      </div>
      <AssetFileFields
        label={`token asset ${index + 1}`}
        files={item.files}
        preview={item.preview}
        generatePng={item.generatePng}
        onFile={(kind, file) => onFile(item.id, kind, file)}
        onGeneratePng={(value) => onGeneratePng(item.id, value)}
      />
    </AssetSection>
  )
}

function ChainAssetFields({
  item,
  index,
  onChange,
  onFile,
  onGeneratePng,
  onClear,
  onRemove,
}: {
  item: ChainAssetItem
  index: number
  onChange: (id: string, update: (item: ChainAssetItem) => ChainAssetItem) => void
  onFile: (id: string, kind: AssetFileKind, file: File) => void
  onGeneratePng: (id: string, value: boolean) => void
  onClear: (id: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <AssetSection index={index} type="chain" onClear={() => onClear(item.id)} onRemove={() => onRemove(item.id)}>
      <ChainInput
        value={item.chainId}
        onChange={(chainId) => onChange(item.id, (current) => ({ ...current, chainId }))}
      />
      <AssetFileFields
        label={`chain asset ${index + 1}`}
        files={item.files}
        preview={item.preview}
        generatePng={item.generatePng}
        onFile={(kind, file) => onFile(item.id, kind, file)}
        onGeneratePng={(value) => onGeneratePng(item.id, value)}
      />
    </AssetSection>
  )
}

function AssetSection({
  index,
  type,
  onClear,
  onRemove,
  children,
}: {
  index: number
  type: AssetMode
  onClear: () => void
  onRemove: () => void
  children: React.ReactNode
}) {
  return (
    <section className="py-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-bold capitalize">
          {type} asset {index + 1}
        </h2>
        <div className="flex gap-2">
          <button type="button" className="px-2 py-1 text-sm opacity-60 hover:opacity-100" onClick={onClear}>
            Clear
          </button>
          {index > 0 && (
            <button type="button" className="flex items-center gap-1 px-2 py-1 text-sm text-red-500" onClick={onRemove}>
              <PiTrash />
              Remove
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  )
}

function ChainInput({
  value,
  onChange,
  onBlur,
}: {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
}) {
  const listId = useId()

  return (
    <label>
      <span className={inputLabelClassName}>Chain</span>
      <Input
        className="w-full"
        list={listId}
        value={value}
        placeholder="1"
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <datalist id={listId}>
        {chainOptions.map((chain) => (
          <option key={chain.id} value={String(chain.id)}>
            {chain.name}
          </option>
        ))}
      </datalist>
    </label>
  )
}

function AssetFileFields({
  label,
  files,
  preview,
  generatePng,
  onFile,
  onGeneratePng,
}: {
  label: string
  files: AssetFiles
  preview: PreviewMap
  generatePng: boolean
  onFile: (kind: AssetFileKind, file: File) => void
  onGeneratePng: (value: boolean) => void
}) {
  return (
    <>
      <Dropzone label={label} preview={preview.svg} onFile={(file) => onFile('svg', file)} />
      <div className="flex flex-col gap-4 border-l-2 border-[var(--card-border)] pl-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-bold">Generate PNG sizes</div>
            <div className="text-sm opacity-60">Render transparent 32×32 and 128×128 PNGs from the SVG.</div>
          </div>
          <Switch checked={generatePng} onChange={onGeneratePng} />
        </div>
        {!generatePng && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FileInput label="32×32 PNG" file={files.png32} onFile={(file) => onFile('png32', file)} />
            <FileInput label="128×128 PNG" file={files.png128} onFile={(file) => onFile('png128', file)} />
          </div>
        )}
      </div>
      {(preview.svg || preview.png32 || preview.png128) && (
        <div>
          <div className="mb-3 text-sm font-bold">Preview</div>
          <div className="flex flex-wrap items-end gap-6">
            <Preview label="SVG" src={preview.svg} size={80} />
            <Preview label="32 px" src={preview.png32} size={32} />
            <Preview label="128 px" src={preview.png128} size={128} />
          </div>
        </div>
      )}
    </>
  )
}

function Dropzone({ label, preview, onFile }: { label: string; preview?: string; onFile: (file: File) => void }) {
  return (
    <label
      className="group flex min-h-36 cursor-pointer items-center justify-center rounded-primary border border-dashed border-[var(--card-border)] bg-[var(--color-input-bg)] p-6 text-center hover:border-interactive-primary-border"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        const file = event.dataTransfer.files[0]
        if (file?.type.includes('svg')) onFile(file)
      }}
    >
      <input
        className="sr-only"
        type="file"
        accept="image/svg+xml,.svg"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
        }}
      />
      <span className="flex flex-col items-center gap-2">
        {preview ? (
          <Image
            unoptimized
            src={preview}
            alt={`${label} SVG preview`}
            width={80}
            height={80}
            className="h-20 w-20 object-contain"
          />
        ) : (
          <PiUploadSimple className="text-3xl opacity-50 group-hover:opacity-100" />
        )}
        <span className="font-bold">{preview ? 'Replace SVG' : 'Drop SVG here or choose a file'}</span>
        <span className="text-xs opacity-50">The SVG is the source file for every logo size.</span>
      </span>
    </label>
  )
}

function FileInput({ label, file, onFile }: { label: string; file?: File; onFile: (file: File) => void }) {
  return (
    <label className="cursor-pointer rounded-primary border border-[var(--card-border)] px-4 py-3 hover:bg-interactive-secondary-hover">
      <span className="block text-sm font-bold">{label}</span>
      <span className="mt-1 block truncate text-xs opacity-60">{file?.name ?? 'Choose PNG file'}</span>
      <input
        className="sr-only"
        type="file"
        accept="image/png"
        onChange={(event) => {
          const nextFile = event.target.files?.[0]
          if (nextFile) onFile(nextFile)
        }}
      />
    </label>
  )
}

function Preview({ label, src, size }: { label: string; src?: string; size: number }) {
  if (!src) return null
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center bg-[var(--card-border)]" style={{ width: size, height: size }}>
        <Image
          unoptimized
          src={src}
          alt={`${label} preview`}
          width={size}
          height={size}
          className="h-full w-full object-contain"
        />
      </div>
      <span className="font-mono text-xs opacity-50">{label}</span>
    </div>
  )
}

function StatusBanner({ status, onDismiss }: { status: Status; onDismiss: () => void }) {
  const Icon = status.tone === 'success' ? PiCheckCircle : status.tone === 'error' ? PiWarningCircle : PiUploadSimple
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-primary border px-4 py-3',
        status.tone === 'error' && 'border-red-500 bg-red-500/10',
        status.tone === 'success' && 'border-green-500 bg-green-500/10',
        status.tone === 'info' && 'border-interactive-primary-border bg-interactive-primary/10',
      )}
    >
      <Icon className="mt-1 shrink-0 text-xl" />
      <div className="min-w-0 flex-1">
        <div className="font-bold">{status.title}</div>
        {status.message && <div className="mt-1 text-sm opacity-70">{status.message}</div>}
        {status.prUrl && (
          <a href={status.prUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-bold underline">
            Open pull request
          </a>
        )}
      </div>
      <button type="button" aria-label="Dismiss" className="opacity-60 hover:opacity-100" onClick={onDismiss}>
        <PiX />
      </button>
    </div>
  )
}

function defaultPrMetadata(mode: AssetMode, tokenItems: TokenAssetItem[], chainItems: ChainAssetItem[]) {
  const items = mode === 'token' ? tokenItems : chainItems
  const paths = items.flatMap((item) => {
    const directory =
      mode === 'token'
        ? `/tokens/${item.chainId}/${(item as TokenAssetItem).address.toLowerCase()}`
        : `/chains/${item.chainId}`
    return [`${directory}/logo.svg`, `${directory}/logo-32.png`, `${directory}/logo-128.png`]
  })
  return {
    title: `feat: add ${mode} assets (${items.length})`,
    body: [
      `Uploaded ${mode} assets through the Yearn CMS.`,
      '',
      'Uploaded locations:',
      ...paths.map((path) => `- ${path}`),
    ].join('\n'),
  }
}

async function buildFormData(
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
      form.append(
        `png32_${item.id}`,
        item.files.png32 ?? (await dataUrlToFile(item.preview.png32 || '', 'logo-32.png')),
      )
      form.append(
        `png128_${item.id}`,
        item.files.png128 ?? (await dataUrlToFile(item.preview.png128 || '', 'logo-128.png')),
      )
    }),
  )
  return form
}
