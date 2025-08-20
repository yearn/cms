import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { useParams } from 'react-router-dom'
import { type CollectionKey, getCollection, getCollectionKeys } from '../../schemas/cms'
import type { StrategyMetadata } from '../../schemas/StrategyMetadata'
import type { VaultMetadata } from '../../schemas/VaultMetadata'
import { useCollectionData } from '../hooks/useCollectionData'
import BackItUp from './BackItUp'
import Link from './elements/Link'
import Finder, { useFinder } from './Finder'
import Skeleton from './Skeleton'
import ToggleChains from './ToggleChains'
import { useToggleChainStore } from './ToggleChains/useToggleStore'
import TokenIcon from './TokenIcon'

const INFINTE_SCROLL_FRAME_SIZE = 20

// Template renderers for different collection types
const listItemTemplates = {
  vault: (item: VaultMetadata) => (
    <Link
      key={`${item.chainId}-${item.address}`}
      to={`/vaults/${item.chainId}/${item.address}`}
      className="flex items-center gap-6 text-lg"
    >
      <TokenIcon chainId={item.chainId} address={item.address as `0x${string}`} showChain size={48} />
      <div>
        {item.address.slice(0, 6)}..{item.address.slice(-6)}
      </div>
      <div>{item.name}</div>
    </Link>
  ),
  strategy: (item: StrategyMetadata) => (
    <Link
      key={`${item.chainId}-${item.address}`}
      to={`/strategies/${item.chainId}/${item.address}`}
      className="flex items-center gap-6 text-lg"
    >
      <TokenIcon chainId={item.chainId} address={item.address as `0x${string}`} showChain size={48} />
      <div>
        {item.address.slice(0, 6)}..{item.address.slice(-6)}
      </div>
      <div>{item.name || 'No name onchain'}</div>
    </Link>
  ),
} as const

function List({ collection }: { collection: CollectionKey }) {
  const { finderString } = useFinder()
  const { toggledChains } = useToggleChainStore()
  const { data } = useCollectionData(collection)
  const collectionConfig = getCollection(collection)

  const filter = useMemo(() => {
    return data.filter(
      (item: any) =>
        toggledChains.has(item.chainId) &&
        (item.name?.toLowerCase().includes(finderString.toLowerCase()) ||
          item.address.toLowerCase().includes(finderString.toLowerCase())),
    )
  }, [data, finderString, toggledChains])

  const [items, setItems] = useState(filter?.slice(0, INFINTE_SCROLL_FRAME_SIZE))
  useEffect(() => setItems(filter?.slice(0, INFINTE_SCROLL_FRAME_SIZE)), [filter])
  const hasMoreFrames = useMemo(() => items.length < filter.length, [items, filter])
  const fetchFrame = useCallback(() => {
    setItems((prevItems) => [
      ...prevItems,
      ...filter.slice(prevItems.length, prevItems.length + INFINTE_SCROLL_FRAME_SIZE),
    ])
  }, [filter])

  const template = listItemTemplates[collectionConfig.listItemTemplate]

  return (
    <InfiniteScroll
      scrollableTarget="main-scroll"
      dataLength={items.length}
      next={fetchFrame}
      hasMore={hasMoreFrames}
      loader={null}
      className="flex flex-col items-start justify-start gap-6"
    >
      {items.map((item: any) => template(item))}
    </InfiniteScroll>
  )
}

function CollectionSkeleton() {
  return (
    <div className="w-200 flex flex-col items-start justify-start gap-6">
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
    </div>
  )
}

function CollectionList() {
  const { collection } = useParams()

  if (!collection || !getCollectionKeys().includes(collection as any)) {
    throw new Error(`Collection ${collection} not found`)
  }

  const collectionKey = collection as CollectionKey

  return (
    <div className="px-8 pt-5 pb-16 flex flex-col">
      <div className="mt-6 mb-12 flex flex-col gap-8 w-fit">
        <Finder className="w-full" />
        <ToggleChains />
      </div>
      <Suspense key={collectionKey} fallback={<CollectionSkeleton />}>
        <List collection={collectionKey} />
      </Suspense>
      <BackItUp />
    </div>
  )
}

export default CollectionList
