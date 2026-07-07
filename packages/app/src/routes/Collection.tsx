import { Suspense, useEffect, useMemo, useState } from 'react'
import { PiGitPullRequest, PiTrash } from 'react-icons/pi'
import { useParams } from 'react-router-dom'
import { getTokenLogoUrl } from '../../lib/assets'
import { chains } from '../../lib/chains'
import { type CollectionKey, getCollection, getCollectionKeys } from '../../schemas/cms'
import Button from '../components/eg/elements/Button'
import Skeleton from '../components/eg/Skeleton'
import GithubSignIn, { useGithubUser } from '../components/GithubSignIn'
import MetaData, { MetaDataProvider, useMetaData } from '../components/SchemaForm'
import { useCollectionData } from '../hooks/useCollectionData'
import {
  buildDraftPatch,
  type DraftableCollection,
  getDraftCartItemId,
  getDraftCartPath,
  useDraftCartStore,
} from '../hooks/useDraftCartStore'

type CollectionProps = {
  collection: CollectionKey
}

type ProviderProps = CollectionProps & {
  children: React.ReactNode
}

const TOKEN_ASSETS_URL = 'https://token-assets.yearn.fi/'

const TOKEN_LOGO_FILES = [
  { fileName: 'logo.svg', label: 'SVG' },
  { fileName: 'logo-32.png', label: '32px PNG' },
  { fileName: 'logo-128.png', label: '128px PNG' },
] as const

const TOKEN_LOGO_BUTTON_CLASS =
  'h-9 px-4 flex items-center justify-center text-sm border cursor-pointer rounded-lg whitespace-nowrap bg-interactive-secondary text-interactive-secondary-text border-interactive-secondary-border hover:bg-interactive-secondary-hover active:bg-interactive-secondary-active'

type TokenLogoFile = (typeof TOKEN_LOGO_FILES)[number]

async function downloadTokenLogo(url: string, fileName: string) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to download ${fileName}`)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

async function downloadTokenLogos(files: Array<TokenLogoFile & { url: string }>) {
  for (const file of files) {
    await downloadTokenLogo(file.url, file.fileName)
  }
}

function TokenLogoDownloads() {
  const { o: token } = useMetaData()
  const [availableFiles, setAvailableFiles] = useState<TokenLogoFile[]>([])

  const logoFiles = useMemo(
    () =>
      TOKEN_LOGO_FILES.map((file) => ({
        ...file,
        url: getTokenLogoUrl(token.chainId, token.address, file.fileName),
      })),
    [token.address, token.chainId],
  )

  const previewLogo = logoFiles.find((file) => file.fileName === 'logo-128.png')
  const showPreview = availableFiles.some((file) => file.fileName === 'logo-128.png') && previewLogo
  const availableLogos = logoFiles.filter((logoFile) =>
    availableFiles.some((file) => file.fileName === logoFile.fileName),
  )

  useEffect(() => {
    const controller = new AbortController()

    async function checkLogoFiles() {
      const results = await Promise.all(
        logoFiles.map(async (file) => {
          try {
            const response = await fetch(file.url, { method: 'HEAD', signal: controller.signal })
            return response.ok ? file : null
          } catch {
            return null
          }
        }),
      )

      if (!controller.signal.aborted) {
        setAvailableFiles(results.filter((file): file is TokenLogoFile & { url: string } => file !== null))
      }
    }

    setAvailableFiles([])
    checkLogoFiles()

    return () => controller.abort()
  }, [logoFiles])

  return (
    <div className="w-200 py-3 flex items-start justify-between gap-6">
      <div>logo</div>
      <div className="w-128 flex flex-col items-start gap-4">
        {showPreview && (
          <img
            src={previewLogo.url}
            alt={`${token.name} token logo`}
            width={128}
            height={128}
            className="rounded-full bg-[var(--card-border)]"
          />
        )}
        <div className="flex flex-col items-start gap-3">
          {availableFiles.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm font-bold">download</div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => downloadTokenLogos(availableLogos)}
                  className={TOKEN_LOGO_BUTTON_CLASS}
                >
                  all
                </button>
                {availableLogos.map((file) => {
                  return (
                    <button
                      key={file.fileName}
                      type="button"
                      onClick={() => downloadTokenLogo(file.url, file.fileName)}
                      className={TOKEN_LOGO_BUTTON_CLASS}
                    >
                      {file.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <a href={TOKEN_ASSETS_URL} target="_blank" rel="noreferrer" className={TOKEN_LOGO_BUTTON_CLASS}>
            Add or update logo
          </a>
        </div>
      </div>
    </div>
  )
}

function DraftActions({ collection }: CollectionProps) {
  const { o: item, isDirty, formState } = useMetaData()
  const upsertItem = useDraftCartStore((state) => state.upsertItem)
  const removeItem = useDraftCartStore((state) => state.removeItem)
  const collectionDraft = collection as DraftableCollection
  const draftId = getDraftCartItemId(collectionDraft, item.chainId, item.address)
  const existingDraft = useDraftCartStore((state) => state.items[draftId])
  const actionLabel = existingDraft ? 'Update draft' : 'Add to draft'

  function handleUpsertDraft() {
    upsertItem({
      id: draftId,
      collection: collectionDraft,
      chainId: item.chainId,
      address: item.address,
      name: item.name || 'No name onchain',
      path: getDraftCartPath(collectionDraft, item.chainId),
      item: formState,
      patch: buildDraftPatch(item, formState),
    })
  }

  return (
    <div className="my-6 ml-auto flex items-center gap-4">
      {existingDraft && (
        <Button variant="secondary" className="flex items-center gap-3" onClick={() => removeItem(draftId)}>
          <PiTrash />
          <span>Remove from draft</span>
        </Button>
      )}

      <Button variant="primary" className="flex items-center gap-3" onClick={handleUpsertDraft} disabled={!isDirty}>
        <PiGitPullRequest />
        <span>{actionLabel}</span>
      </Button>
    </div>
  )
}

function CollectionDetails({ collection }: CollectionProps) {
  const { signedIn } = useGithubUser()
  const { o: item } = useMetaData()

  return (
    <div className="flex flex-col items-start justify-start gap-4 w-200">
      {/* Standard header for all CMS types */}
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold truncate">{item.name}</h1>
        {item.chainId && (
          <div>
            chain: {chains[item.chainId]?.name} ({item.chainId})
          </div>
        )}
        {item.address && <div>address: {item.address}</div>}
        {item.registry && <div>registry: {item.registry}</div>}
      </div>

      <MetaData className="w-200" readOnly={!signedIn} />
      {collection === 'tokens' && <TokenLogoDownloads />}
      <Suspense fallback={<Skeleton className="h-12 w-96 my-6 ml-auto" />}>
        {signedIn && <DraftActions collection={collection} />}
        {!signedIn && <GithubSignIn className="my-6 ml-auto" />}
      </Suspense>
    </div>
  )
}

function Provider({ children, collection }: ProviderProps) {
  const { chainId, address } = useParams()
  const collectionConfig = getCollection(collection)
  const { data } = useCollectionData(collection)
  const collectionDraft = collection as DraftableCollection
  const draftId = getDraftCartItemId(collectionDraft, Number(chainId), address ?? '')
  const draftItem = useDraftCartStore((state) => state.items[draftId])
  const normalizedAddress = address?.toLowerCase()

  const item = data.find((d: any) => d.chainId.toString() === chainId && d.address.toLowerCase() === normalizedAddress)

  if (!item) {
    throw new Error(`${collectionConfig.displayName.slice(0, -1)} not found`)
  }

  return (
    <MetaDataProvider schema={collectionConfig.schema} o={item} initialState={draftItem?.item}>
      {children}
    </MetaDataProvider>
  )
}

function CollectionSkeleton() {
  return (
    <div className="w-200 flex flex-col items-start justify-start gap-6">
      <Skeleton className="w-full h-42" />
      <Skeleton className="w-full h-16" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-16" />
      <Skeleton className="w-full h-16" />
    </div>
  )
}

function Collection() {
  const { collection } = useParams()

  if (!collection || !getCollectionKeys().includes(collection as any)) {
    throw new Error(`Collection ${collection} not found`)
  }

  const collectionKey = collection as CollectionKey

  return (
    <div className="px-8 pt-5 pb-16">
      <Suspense fallback={<CollectionSkeleton />}>
        <Provider collection={collectionKey}>
          <CollectionDetails collection={collectionKey} />
        </Provider>
      </Suspense>
    </div>
  )
}

export default Collection
