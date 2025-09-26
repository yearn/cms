import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { Link, useParams } from 'react-router-dom'
import { type CollectionKey, getCollection, getCollectionKeys } from '../../schemas/cms'
import type { StrategyMetadata } from '../../schemas/StrategyMetadata'
import type { TokenMetadata } from '../../schemas/TokenMetadata'
import type { VaultMetadata } from '../../schemas/VaultMetadata'
import { useCollectionData } from '../hooks/useCollectionData'
import { useToggleChainStore } from '../hooks/useToggleChainStore'
import BackItUp from './BackItUp'
import ListItem from './eg/elements/ListItem'
import Skeleton from './eg/Skeleton'
import TokenIcon from './eg/TokenIcon'
import { useFinder } from './Finder'

const INFINTE_SCROLL_FRAME_SIZE = 20

// Template renderers for different collection types
const listItemTemplates = {
  vault: (item: VaultMetadata) => (
    <Link
      key={`${item.chainId}-${item.address}`}
      to={`/vaults/${item.chainId}/${item.address}`}
      className="block w-full"
    >
      <ListItem variant="lg" className="gap-6">
        <TokenIcon chainId={item.chainId} address={item.address as `0x${string}`} showChain size={48} />
        <div className="flex flex-col gap-1">
          <div className="font-mono text-sm opacity-70">
            {item.address.slice(0, 6)}..{item.address.slice(-6)}
          </div>
          <div className="font-medium">{item.name}</div>
        </div>
      </ListItem>
    </Link>
  ),
  strategy: (item: StrategyMetadata) => (
    <Link
      key={`${item.chainId}-${item.address}`}
      to={`/strategies/${item.chainId}/${item.address}`}
      className="block w-full"
    >
      <ListItem variant="lg" className="gap-6">
        <TokenIcon chainId={item.chainId} address={item.address as `0x${string}`} showChain size={48} />
        <div className="flex flex-col gap-1">
          <div className="font-mono text-sm opacity-70">
            {item.address.slice(0, 6)}..{item.address.slice(-6)}
          </div>
          <div className="font-medium">{item.name || 'No name onchain'}</div>
        </div>
      </ListItem>
    </Link>
  ),
  token: (item: TokenMetadata) => (
    <Link
      key={`${item.chainId}-${item.address}`}
      to={`/tokens/${item.chainId}/${item.address}`}
      className="block w-full"
    >
      <ListItem variant="lg" className="gap-6">
        <TokenIcon chainId={item.chainId} address={item.address as `0x${string}`} showChain size={48} />
        <div className="flex flex-col gap-1">
          <div className="font-mono text-sm opacity-70">
            {item.address.slice(0, 6)}..{item.address.slice(-6)}
          </div>
          <div className="font-medium">{item.name || 'No name onchain'}</div>
        </div>
      </ListItem>
    </Link>
  ),
} as const

function List({ collection }: { collection: CollectionKey }) {
  const { finderString } = useFinder()
  const { toggledChains } = useToggleChainStore()
  const { data } = useCollectionData<typeof collection>(collection)
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
    <div className="flex flex-col items-start justify-start gap-6">
      <Skeleton className="w-full h-20" />
      <Skeleton className="w-full h-20" />
      <Skeleton className="w-full h-20" />
      <Skeleton className="w-full h-20" />
      <Skeleton className="w-full h-20" />
      <Skeleton className="w-full h-20" />
      <Skeleton className="w-full h-20" />
      <Skeleton className="w-full h-20" />
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
      <Suspense key={collectionKey} fallback={<CollectionSkeleton />}>
        <List collection={collectionKey} />
      </Suspense>
      <BackItUp />
    </div>
  )
}

export default CollectionList
