import { Suspense } from 'react'
import { PiGitPullRequest, PiTrash } from 'react-icons/pi'
import { useParams } from 'react-router-dom'
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
